import { useState } from 'react'
import {
  PBCheckbox, PBCommandRow, PBDataWindow, PBInput, PBSelect, PBTextArea, PBViewHeader, pbSlug, usePBInstrumentation,
} from '../pb'
import { clinicListSpec, clinicRowsKey, type ClinicRow } from '../data/clinicManagement'
import { EXTERNAL_ORGANIZATION_TYPE, valueSetValues } from '../data/codesets'
import { MOIS_TODAY } from '../data/patients'
import { S } from '../data/text'
import { useScreenReport } from '../host/screen-state'
import { nowStamp, useStoredList, useValueSets } from './adminSession'
import { CellSelect, CellText, CentredFooter, Cmd, Line, NavyBand, NavyHead, onF2 } from './adminKit'
import { DemographicModal } from './DemographicDialogs'
import { useColumnFilters } from './listKit'
import { LookupBand, PickListWindow, SearchForRow } from './lookupKit'

/* ============================================================================
   Administration ▸ External Service Providers and Clinic Management — the
   lists that are edited in place, and the Clinic windows.

     ad-organizations   Organization List         303121 `7eca3b91…`,
                                                  `0b83bdf1…`, `b178c4df…`
     ad-locations       Service Location List     303059 `93837c26…`
     new-clinic         Clinics ▸ New Record      INFERRED
     clinic-detail      Clinics ▸ Edit Record     303117 `80ce364e…`
     add-external-organization
                        the Address Book's Other Options ▸ Add an External
                        Organization ▸ Go (3179351) — INFERRED, see below

   Organization List (303121 "Editing an Organization"): pick the record,
   "Select the field where edits are required", change it (the fax number is
   the article's example), Save. The Name is edited on its grid line, the
   Organization Type is a drop-down of Codeset Management ▸ Value Sets ▸
   EXTERNAL ORGANIZATION TYPE (so a type added there is offered here), and
   the contact block under the grid follows the current row: Address (two
   lines), City, Province, Postal Code, Country, Phone, Fax, Note and the
   Created stamp. New Record adds a row and makes it current; Undo drops
   the unsaved edits; Refresh re-reads what was saved.

   Service Location List (303059): Service Location · Make Available on
   Scheduler · Service Delivery Location with its "…" — "a list of all
   Northern Health Sites" — every cell edited in place and saved from the
   command row. The drop list of sites is INFERRED (no capture opens it).

   New Clinic is INFERRED (Code, Description; Create Record opens Clinic
   Detail on the new code, the way New Service Center does). Clinic Detail
   is `80ce364e…`: navy "Clinic"; Clinic Identification (Code, Description,
   Detail); Contact Information (three address lines, City, Province,
   Country, Postal Code; Primary, Secondary, Fax); General (Note); Save
   Changes (F2) / Cancel.

   The quick-add window (add-external-organization) has no capture — 3179351's
   screenshots are missing from the manual. It is built from the article's
   words: "Fill out the Details (at minimum add the Name and Fax; adding Type
   and City is also recommended). Click OK."

   Anchors: rows host.mois.row.organization-<name>, location-<name>;
   fields host.mois.field.org-name-<n>, org-type-<n>, address, address-2,
   city, province, postal-code, country, phone, fax, note, location-name-<n>,
   location-scheduler-<n>, delivery-location-<n>; lookup host.mois.lookup.
   delivery-location-<n>; dialogs delivery-location-lookup, new-clinic,
   clinic-detail, add-external-organization.
   ========================================================================= */

export const useListRows = (node: string) => useStoredList<ClinicRow>(clinicRowsKey(node), clinicListSpec(node)?.rows ?? EMPTY)
const EMPTY: ClinicRow[] = []

/* ===========================================================================
   Organization List                     `7eca3b91…`, `0b83bdf1…`
   ======================================================================== */

export function ExternalOrganizationsView() {
  const [saved, commit] = useListRows('ad-organizations')
  const [valueSets] = useValueSets()
  const [rows, setRows] = useState<ClinicRow[]>(saved)
  const [cur, setCur] = useState(0)
  const filters = useColumnFilters(rows.map((r, index) => ({ r, index })), [
    { key: 'name', value: (x) => x.r.name, anchor: 'filter-name' },
    { key: 'type', value: (x) => x.r.orgType, anchor: 'filter-org-type' },
    null, null,
  ], { onChange: () => setCur(0) })
  const { shown } = filters
  const [savedFlag, setSavedFlag] = useState(false)
  const types = ['', ...valueSetValues(valueSets, EXTERNAL_ORGANIZATION_TYPE)]
  const at = Math.min(cur, Math.max(0, shown.length - 1))
  const current = shown[at]
  const dirty = rows !== saved
  useScreenReport({ rows: rows.length, row: current ? `organization-${pbSlug(S(current.r.name))}` : null, saved: savedFlag && !dirty, draft: dirty })
  const edit = (index: number, patch: ClinicRow) => { setRows((all) => all.map((r, j) => (j === index ? { ...r, ...patch } : r))); setSavedFlag(false) }
  const field = (label: string, key: string, w: number) => (
    <Line label={label} w={74}>
      <PBInput w={w} value={S(current?.r[key])} disabled={!current} onChange={(e) => current && edit(current.index, { [key]: e.target.value })}
        data-tutorial-id={`host.mois.field.${key === 'address2' ? 'address-2' : key === 'address1' ? 'address' : key === 'postal' ? 'postal-code' : key}`} />
    </Line>
  )
  return (
    <>
      <PBViewHeader title="Organization List" />
      <PBCommandRow
        commands={[
          { label: 'New Record', onClick: () => {
            setRows((all) => [...all, { name: '', orgType: '', city: '', phone: '', address1: '', address2: '', province: 'BC', postal: '', country: 'CANADA', fax: '', note: '', created: nowStamp(MOIS_TODAY) }])
            filters.clear(); setCur(rows.length); setSavedFlag(false)
          } },
          { label: 'Delete Record', onClick: () => { if (current) { setRows((all) => all.filter((_, j) => j !== current.index)); setCur(0); setSavedFlag(false) } } },
          { label: 'Save', onClick: () => { const next = rows.filter((r) => S(r.name).trim()); commit(() => next); setRows(next); setSavedFlag(true) } },
          { label: 'Undo', onClick: () => { setRows(saved); setSavedFlag(false) } },
          { label: 'Refresh', onClick: () => { setRows(saved); setCur(0) } },
        ]}
      />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3, background: '#fff' }}>
        <PBDataWindow<{ r: ClinicRow; index: number }>
          rows={shown}
          current={at}
          onCurrentChange={setCur}
          rowTutorialId={(x) => `host.mois.row.organization-${pbSlug(S(x.r.name)) || x.index + 1}`}
          style={{ ['--pb-band' as string]: '#ffffff' }}
          filters={filters.filterRow}
          columns={[
            { key: 'name', header: 'Name', width: 359, headAlign: 'center', render: (x) => <CellText value={x.r.name} onChange={(v) => edit(x.index, { name: v.toUpperCase() })} anchor={`org-name-${x.index + 1}`} /> },
            { key: 'orgType', header: 'Organization Type', width: 168, headAlign: 'center', render: (x) => <CellSelect value={x.r.orgType} options={types.includes(S(x.r.orgType)) ? types : [...types, S(x.r.orgType)]} onChange={(v) => edit(x.index, { orgType: v })} anchor={`org-type-${x.index + 1}`} /> },
            { key: 'city', header: 'City', width: 150, headAlign: 'center', render: (x) => S(x.r.city) },
            { key: 'phone', header: 'Phone', width: 95, align: 'center', render: (x) => S(x.r.phone) },
          ]}
        />
      </div>
      <div style={{ height: 1, background: '#646464', flex: 'none' }} />
      <div className="pb-row" style={{ alignItems: 'flex-start', gap: 18, padding: '6px 8px', flex: 'none', background: 'var(--pb-face)' }} data-tutorial-id="host.mois.field.organization-contact">
        <div>
          {field('Address:', 'address1', 390)}
          {field('Address:', 'address2', 390)}
          <div className="pb-row" style={{ gap: 30 }}>{field('City:', 'city', 108)}{field('Province:', 'province', 156)}</div>
          <div className="pb-row" style={{ gap: 30 }}>{field('Postal Code:', 'postal', 108)}{field('Country:', 'country', 156)}</div>
          {field('Phone:', 'phone', 108)}
          {field('Fax:', 'fax', 108)}
        </div>
        <Line label="Note:" w={40} style={{ alignItems: 'flex-start', flex: '1 1 auto' }}>
          <PBTextArea rows={6} w="100%" value={S(current?.r.note)} disabled={!current} onChange={(e) => current && edit(current.index, { note: e.target.value })} data-tutorial-id="host.mois.field.note" />
        </Line>
      </div>
      <div style={{ background: '#f0f0f0', padding: '3px 8px', flex: 'none' }}>Created:&nbsp;&nbsp;&nbsp;&nbsp;{S(current?.r.created)}</div>
    </>
  )
}

/* ===========================================================================
   Service Location List                 `93837c26…`
   ======================================================================== */

/* "Service Delivery Location: This is a list of all Northern Health Sites" —
   public facility names; the two HALLIWELL sites are the training clinic's */
export const DELIVERY_LOCATIONS = [
  'BULKLEY VALLEY DISTRICT HOSPITAL', 'DAWSON CREEK AND DISTRICT HOSPITAL', 'FORT ST. JOHN HOSPITAL', 'GR BAKER MEMORIAL HOSPITAL',
  'KITIMAT GENERAL HOSPITAL', 'LAKES DISTRICT HOSPITAL', 'MCBRIDE AND DISTRICT HOSPITAL', 'MILLS MEMORIAL HOSPITAL',
  'PRINCE GEORGE - ANNEX', 'PRINCE GEORGE - HALLIWELL', 'PRINCE RUPERT REGIONAL HOSPITAL', 'ST. JOHN HOSPITAL',
  'UNIVERSITY HOSPITAL OF NORTHERN BC',
]

export function ServiceLocationView() {
  const host = usePBInstrumentation()
  const [saved, commit] = useListRows('ad-locations')
  const [rows, setRows] = useState<ClinicRow[]>(saved)
  const [cur, setCur] = useState(0)
  const filters = useColumnFilters(rows.map((r, index) => ({ r, index })), [
    { key: 'location', value: (x) => x.r.location, anchor: 'filter-location' },
    null, null, null,
  ], { onChange: () => setCur(0) })
  const { shown } = filters
  const [picking, setPicking] = useState<number | null>(null)
  const [savedFlag, setSavedFlag] = useState(false)
  const at = Math.min(cur, Math.max(0, shown.length - 1))
  const dirty = rows !== saved
  useScreenReport({ rows: rows.length, row: shown[at] ? `location-${pbSlug(S(shown[at]!.r.location))}` : null, saved: savedFlag && !dirty, draft: dirty, scheduled: rows.filter((r) => r.scheduler).length })
  const edit = (index: number, patch: ClinicRow) => { setRows((all) => all.map((r, j) => (j === index ? { ...r, ...patch } : r))); setSavedFlag(false) }
  return (
    <>
      <PBViewHeader title="Service Location List" />
      <PBCommandRow
        commands={[
          { label: 'New Record', onClick: () => { setRows((all) => [...all, { location: '', scheduler: false, delivery: '' }]); filters.clear(); setCur(rows.length); setSavedFlag(false) } },
          { label: 'Delete Record', onClick: () => { const x = shown[at]; if (x) { setRows((all) => all.filter((_, j) => j !== x.index)); setCur(0); setSavedFlag(false) } } },
          { label: 'Save', onClick: () => { const next = rows.filter((r) => S(r.location).trim()); commit(() => next); setRows(next); setSavedFlag(true) } },
          { label: 'Undo', onClick: () => { setRows(saved); setSavedFlag(false) } },
          { label: 'Refresh', onClick: () => { setRows(saved); setCur(0) } },
        ]}
      />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: 3, background: '#fff' }}>
        <PBDataWindow<{ r: ClinicRow; index: number }>
          rows={shown}
          current={at}
          onCurrentChange={setCur}
          rowTutorialId={(x) => `host.mois.row.location-${pbSlug(S(x.r.location)) || x.index + 1}`}
          style={{ ['--pb-band' as string]: '#ffffff' }}
          filters={filters.filterRow}
          columns={[
            { key: 'location', header: 'Service Location', width: 410, headAlign: 'center', render: (x) => <CellText value={x.r.location} onChange={(v) => edit(x.index, { location: v.toUpperCase() })} anchor={`location-name-${x.index + 1}`} /> },
            { key: 'scheduler', header: <>Make Available<br />on Scheduler</>, width: 96, align: 'center', render: (x) => <PBCheckbox checked={Boolean(x.r.scheduler)} onChange={(v) => edit(x.index, { scheduler: v })} tutorialId={`host.mois.field.location-scheduler-${x.index + 1}`} /> },
            { key: 'delivery', header: 'Service Delivery Location', width: 225, headAlign: 'center', render: (x) => <CellText value={x.r.delivery} readOnly onChange={() => undefined} anchor={`delivery-location-${x.index + 1}`} /> },
            {
              key: 'dots', header: '', width: 21, dots: true,
              render: (x) => (
                <button type="button" className="pb-dw__dots" data-tutorial-id={host?.anchor('lookup', `delivery-location-${x.index + 1}`)}
                  onClick={(e) => { e.stopPropagation(); host?.report('lookup', { field: `delivery-location-${x.index + 1}` }); setPicking(x.index) }}>…</button>
              ),
            },
          ]}
        />
      </div>
      {picking !== null && (
        <DeliveryLocationLookup
          initial={S(rows[picking]?.delivery)}
          onClose={() => setPicking(null)}
          onPick={(site) => { edit(picking, { delivery: site }); setPicking(null) }}
        />
      )}
    </>
  )
}

function DeliveryLocationLookup({ initial, onPick, onClose }: { initial: string; onPick: (site: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState('')
  const rows = DELIVERY_LOCATIONS.filter((s) => s.includes(search.trim().toUpperCase())).map((site) => ({ site }))
  const [cur, setCur] = useState(() => Math.max(0, DELIVERY_LOCATIONS.indexOf(initial)))
  const at = Math.min(cur, Math.max(0, rows.length - 1))
  return (
    <PickListWindow
      frame={(content, footer) => (
        <DemographicModal title="Advanced Lookup Service" width={520} height={500} onClose={onClose} dialog="delivery-location-lookup">
          {content}
          {footer}
        </DemographicModal>
      )}
      panel={{ margin: '8px 8px 0', border: '1px solid #9a9a9a', background: '#fff', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}
      band={<LookupBand variant="grey">Service Delivery Location</LookupBand>}
      search={(
        <SearchForRow salmon style={{ gap: 4, padding: '2px 4px' }} field="delivery-location-search"
          value={search} onChange={(v) => { setSearch(v); setCur(0) }} />
      )}
      grid={{
        rows, current: at, onCurrentChange: setCur, onActivate: (r) => onPick(r.site),
        rowTutorialId: (r) => `host.mois.row.site-${pbSlug(r.site)}`, empty: 'No site matches.',
        columns: [{ key: 'site', header: 'Northern Health Site', width: 440, headAlign: 'center' }],
      }}
      footer={(
        <CentredFooter>
          <Cmd id="delivery-location-ok" w={74} disabled={!rows[at]} onClick={() => rows[at] && onPick(rows[at]!.site)}>Ok</Cmd>
          <Cmd id="delivery-location-cancel" w={74} onClick={onClose}>Cancel</Cmd>
        </CentredFooter>
      )}
    />
  )
}

/* ===========================================================================
   New Clinic (INFERRED) / Clinic Detail (`80ce364e…`)
   ======================================================================== */

export function NewClinicDialog({ close, open, onAdded }: { close: () => void; open: (id: string, args?: Record<string, unknown>) => void; onAdded?: () => void }) {
  const [rows, update] = useListRows('ad-clinics')
  const [code, setCode] = useState('')
  const [desc, setDesc] = useState('')
  const create = () => {
    const c = code.trim().toUpperCase()
    if (!c || rows.some((r) => S(r.code) === c)) return
    update((all) => [...all, { code: c, desc, city: '', primary: '', secondary: '', fax: '' }])
    onAdded?.()
    open('clinic-detail', { key: c })
  }
  return (
    <DemographicModal title="New Clinic" width={430} onClose={close} dialog="new-clinic">
      <div style={{ padding: '12px 18px', background: 'var(--pb-face)' }}>
        <Line label="Code:" w={80}><PBInput w={140} value={code} onChange={(e) => setCode(e.target.value)} style={{ background: '#ffc09c' }} data-tutorial-id="host.mois.field.code" /><span style={{ color: '#808080' }}>(required - unique)</span></Line>
        <Line label="Description:" w={80}><PBInput w={272} value={desc} onChange={(e) => setDesc(e.target.value)} data-tutorial-id="host.mois.field.description" /></Line>
      </div>
      <CentredFooter>
        <Cmd id="create-record" w={96} onClick={create}>Create Record</Cmd>
        <Cmd id="cancel" w={88} onClick={close}>Cancel</Cmd>
      </CentredFooter>
    </DemographicModal>
  )
}

export function ClinicDetailWindow({ rowKey, close }: { rowKey: string; close: () => void }) {
  const [rows, update] = useListRows('ad-clinics')
  const row = rows.find((r) => S(r.code) === rowKey) ?? { code: rowKey }
  const [d, setD] = useState<ClinicRow>(() => ({ ...row }))
  const set = (patch: ClinicRow) => setD((x) => ({ ...x, ...patch }))
  const box = (key: string, w: number, anchor = key) => (
    <PBInput w={w} value={S(d[key])} onChange={(e) => set({ [key]: e.target.value })} data-tutorial-id={`host.mois.field.${anchor}`} />
  )
  const save = () => { update((all) => all.map((r) => (S(r.code) === rowKey ? { ...r, ...d } : r))); close() }
  useScreenReport({ dialog: 'clinic-detail' })
  return (
    <DemographicModal title="Clinic Detail" width={875} height={578} onClose={close} dialog="clinic-detail">
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', margin: 6, border: '1px solid #8a8a8a', background: 'var(--pb-face)' }} onKeyDown={onF2(save)}>
        <NavyBand>Clinic</NavyBand>
        <NavyHead>Clinic Identification</NavyHead>
        <div style={{ padding: '4px 8px' }}>
          <Line label="Code:" w={78}><PBInput w={162} value={S(d.code)} readOnly style={{ background: '#ffc09c' }} data-tutorial-id="host.mois.field.code" /></Line>
          <Line label="Description:" w={78}>{box('desc', 336, 'description')}</Line>
          <Line label="Detail:" w={78} style={{ alignItems: 'flex-start' }}><PBTextArea rows={2} w={336} value={S(d.detail)} onChange={(e) => set({ detail: e.target.value })} data-tutorial-id="host.mois.field.detail" /></Line>
        </div>
        <NavyHead>Contact Information</NavyHead>
        <div className="pb-row" style={{ alignItems: 'flex-start', padding: '4px 8px', gap: 0 }}>
          <div style={{ flex: '1 1 0' }}>
            <Line label="Address:" w={78}>{box('address1', 336, 'address')}</Line>
            <Line w={78}>{box('address2', 336, 'address-2')}</Line>
            <Line w={78}>{box('address3', 336, 'address-3')}</Line>
            <Line label="City:" w={78}>{box('city', 200)}</Line>
            <Line label="Province:" w={78}>{box('province', 200)}</Line>
            <Line label="Country:" w={78}>{box('country', 200)}</Line>
            <Line label="Postal Code:" w={78}>{box('postal', 104, 'postal-code')}</Line>
          </div>
          <div style={{ flex: '0 0 300px' }}>
            <Line label="Primary:" w={80} right>{box('primary', 104)}</Line>
            <Line label="Secondary:" w={80} right>{box('secondary', 104)}</Line>
            <Line label="Fax:" w={80} right>{box('fax', 104)}</Line>
          </div>
        </div>
        <NavyHead>General</NavyHead>
        <div style={{ padding: '4px 8px' }}>
          <Line label="Note:" w={78} style={{ alignItems: 'flex-start' }}><PBTextArea rows={3} w={570} value={S(d.note)} onChange={(e) => set({ note: e.target.value })} data-tutorial-id="host.mois.field.note" /></Line>
        </div>
      </div>
      <CentredFooter>
        <Cmd id="save-changes" w={108} primary onClick={save}>Save Changes (F2)</Cmd>
        <Cmd id="clinic-cancel" w={108} onClick={close}>Cancel</Cmd>
      </CentredFooter>
    </DemographicModal>
  )
}

/* ===========================================================================
   Add an External Organization — the Address Book's quick-add (3179351,
   INFERRED: no capture survives in the manual)
   ======================================================================== */

export function AddExternalOrganizationDialog({ existing, onCreated, onClose }: {
  /** Update Current Record: the organization to edit, by name */
  existing?: string
  onCreated: (name: string) => void
  onClose: () => void
}) {
  const [rows, commit] = useListRows('ad-organizations')
  const [valueSets] = useValueSets()
  const [d, setD] = useState<ClinicRow>(() => ({
    name: '', orgType: '', address1: '', city: '', province: 'BC', postal: '', country: 'CANADA', phone: '', fax: '', note: '',
    ...(existing ? rows.find((r) => S(r.name) === existing) : null),
  }))
  const [missing, setMissing] = useState(false)
  const set = (patch: ClinicRow) => setD((x) => ({ ...x, ...patch }))
  const box = (label: string, key: string, w: number) => (
    <Line label={label} w={100}><PBInput w={w} value={S(d[key])} onChange={(e) => set({ [key]: e.target.value })} data-tutorial-id={`host.mois.field.new-org-${pbSlug(label)}`} /></Line>
  )
  const ok = () => {
    const name = S(d.name).trim().toUpperCase()
    if (!name || !S(d.fax).trim()) { setMissing(true); return }
    if (existing) commit((all) => all.map((r) => (S(r.name) === existing ? { ...r, ...d, name } : r)))
    else commit((all) => [...all, { ...d, name, created: nowStamp(MOIS_TODAY) }])
    onCreated(name)
  }
  useScreenReport({ dialog: 'add-external-organization', missing })
  return (
    <DemographicModal title={existing ? 'Update External Organization' : 'Add an External Organization'} width={520} onClose={onClose} dialog="add-external-organization">
      <div style={{ padding: '10px 16px', background: 'var(--pb-face)' }}>
        <div style={{ color: '#808080', paddingBottom: 6 }}>At minimum add the Name and Fax; adding Type and City is also recommended.</div>
        {box('Name:', 'name', 330)}
        <Line label="Type:" w={100}><PBSelect w={220} options={['', ...valueSetValues(valueSets, EXTERNAL_ORGANIZATION_TYPE)]} value={S(d.orgType)} onChange={(e) => set({ orgType: e.target.value })} data-tutorial-id="host.mois.field.new-org-type" /></Line>
        {box('Address:', 'address1', 330)}
        {box('City:', 'city', 200)}
        {box('Province:', 'province', 60)}
        {box('Postal Code:', 'postal', 100)}
        {box('Phone:', 'phone', 140)}
        {box('Fax:', 'fax', 140)}
        {missing && <div style={{ color: '#c00000', paddingTop: 4 }}>Enter the organization&apos;s Name and Fax.</div>}
      </div>
      <CentredFooter>
        <Cmd id="new-org-ok" w={74} onClick={ok}>OK</Cmd>
        <Cmd id="new-org-cancel" w={74} onClick={onClose}>Cancel</Cmd>
      </CentredFooter>
    </DemographicModal>
  )
}
