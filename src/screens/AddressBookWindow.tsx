import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  ADDRESS_PARAMETERS, CONTACT_LISTS, MATCH_MODES, searchAddressBook, typesFor,
  type AddressBookEntry, type AddressBookList, type AddressBookMode, type AddressParameterKey, type MatchMode,
} from '../data/addressBook'
import { useScreenReport } from '../host/screen-state'
import { PBButton, PBCheckbox, PBDataWindow, PBInput, PBSelect, PBWindow, pbSlug, usePBInstrumentation } from '../pb'
import { registerAreaWindow } from './areaWindowRegistry'
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

   Neither capture shows a search run, so what Search returns (the stage's
   directory, data/addressBook.ts), what Other Options holds, and the
   non-"Includes" match modes are the stage's own. Save as Default, My
   Favourites and Go are inert.

   Opening it
   · From a window's own state (the Viewer's Find bar, Select Medications to
     Print's "Add One"): render `<AddressBookWindow mode="pharmacy" onSelect
     onClose />` — it portals onto the desktop over whatever raised it.
   · By name (`host.mois.openUtility {window: 'address-book', mode}`, or
     `useOpenWindow()('address-book', { mode: 'pharmacy' })`) when nothing
     else is using the area-window slot.

   Anchors: host.mois.dialog.address-book; host.mois.field.address-{name,
   pract-no, specialty, group, city} (+ `-match`), address-active-only,
   address-type-{slug}, address-pharmacy-only, address-contact-{slug};
   host.mois.command.{all, clear, search, ok, cancel, save-as-default,
   my-favourites, go}; rows host.mois.row.address-{slug of name}.
   Reported: host.dialog = address-book, host.screen.addressBook = the mode,
   host.screen.addressBookRows = the grid's row count.
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
function Cmd({ label, onClick, w = 86 }: { label: string; onClick?: () => void; w?: number }) {
  const host = usePBInstrumentation()
  return (
    <PBButton
      data-tutorial-id={host?.anchor('command', pbSlug(label))}
      onClick={() => { host?.report('command', { command: pbSlug(label) }); onClick?.() }}
      style={{ minWidth: w }}
    >
      {label}
    </PBButton>
  )
}

export function AddressBookWindow({
  mode = 'provider-address', onClose, onSelect,
}: {
  /** the Find bar's Provider + MSP / Provider + Address, or the pharmacy picker */
  mode?: AddressBookMode
  onClose: () => void
  /** Ok (or a double-click) with a row current; the window does not close itself */
  onSelect?: (entry: AddressBookEntry) => void
}) {
  const host = usePBInstrumentation()
  const pharmacy = mode === 'pharmacy'
  const allTypes = typesFor(mode)
  const [types, setTypes] = useState<Set<AddressBookList>>(() => new Set(allTypes))
  const [pharmacyOnly, setPharmacyOnly] = useState(true)
  const [quesnel, setQuesnel] = useState(false)
  const [params, setParams] = useState<Partial<Record<AddressParameterKey, string>>>({})
  const [modes, setModes] = useState<Partial<Record<AddressParameterKey, MatchMode>>>({})
  const [activeOnly, setActiveOnly] = useState(true)
  const [results, setResults] = useState<AddressBookEntry[] | null>(null)
  const [cur, setCur] = useState(0)
  const rows = useMemo(() => results ?? [], [results])

  useScreenReport({ dialog: 'address-book', addressBook: mode, addressBookRows: rows.length })

  const search = () => {
    setResults(searchAddressBook({ types, params, modes, activeOnly, pharmacyOnly: pharmacy && pharmacyOnly }))
    setCur(0)
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

  return (
    <DesktopLayer>
      <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 90 }}>
        <PBWindow
          child
          controls={false}
          title={pharmacy ? 'MOIS - Address Book for Pharmacy List' : 'MOIS - Address Book'}
          onClose={onClose}
          tutorialId="host.mois.dialog.address-book"
          style={{ width: 'min(1150px, calc(100% - 16px))', height: 'min(850px, calc(100% - 16px))' }}
        >
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'grid', gridTemplateColumns: '205px minmax(0, 300px) minmax(0, 1fr)', gridTemplateRows: 'auto minmax(0, 1fr)', gap: 5, padding: '6px 5px 0', background: 'var(--pb-face)' }}>
            {/* Contact Lists — full height */}
            <Panel caption="Contact Lists" style={{ gridRow: '1 / span 2' }}>
              <div style={{ padding: '2px 0' }}>
                <div
                  data-tutorial-id={host?.anchor('field', `address-contact-${pbSlug(CONTACT_LISTS.root)}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, height: 22, padding: '0 8px 0 12px', background: '#e3e5e6' }}
                >
                  <span aria-hidden="true" style={{ display: 'inline-grid', placeItems: 'center', width: 9, height: 9, border: '1px solid #8c8c8c', fontSize: 9, lineHeight: 1, background: '#fff' }}>−</span>
                  {CONTACT_LISTS.root}
                </div>
                {CONTACT_LISTS.children.map((c) => (
                  <div key={c} style={{ display: 'flex', alignItems: 'center', height: 22, padding: '0 8px 0 10px' }}>
                    <PBCheckbox label={c} checked={quesnel} onChange={setQuesnel} tutorialId={host?.anchor('field', `address-contact-${pbSlug(c)}`)} />
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
                      onKeyDown={(e) => { if (e.key === 'Enter') search() }}
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
              <div style={{ padding: '18px 0 0 12px' }}>
                <Cmd label="Search" onClick={search} w={94} />
              </div>
            </Panel>

            {/* the results grid, under the two top panels */}
            <div style={{ ...PANEL, gridColumn: '2 / span 2', position: 'relative' }}>
              <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
                <PBDataWindow
                  flush
                  columns={[
                    { key: 'name', header: 'Name', width: '34%' },
                    { key: 'location', header: 'Location', width: '26%' },
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
              <Cmd label="Save as Default" w={0} />
              <Cmd label="My Favourites" w={0} />
            </span>
            <span className="pb-footer__spacer" />
            <span style={{ display: 'flex', gap: 10 }}>
              <Cmd label="Ok" onClick={ok} />
              <Cmd label="Cancel" onClick={onClose} />
            </span>
            <span className="pb-footer__spacer" />
            <span style={{ display: 'flex', gap: 6 }}>
              <PBSelect w={204} options={['Other Options...']} data-tutorial-id={host?.anchor('field', 'address-other-options')} />
              <Cmd label="Go" w={62} />
            </span>
          </div>
        </PBWindow>
      </div>
    </DesktopLayer>
  )
}

/* by name: `host.mois.openUtility {window: 'address-book', mode: 'pharmacy'}` */
registerAreaWindow('address-book', ({ args, close }) => (
  <AddressBookWindow
    mode={args.mode === 'pharmacy' || args.mode === 'provider-msp' ? args.mode : 'provider-address'}
    onClose={close}
    onSelect={() => close()}
  />
))
