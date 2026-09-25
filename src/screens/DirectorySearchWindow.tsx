import { useEffect, useMemo, useRef, useState } from 'react'
import { directoryEntries, type DirectoryEntry, type DirectoryType } from '../data/providers'
import { PBButton, PBCheckbox, PBDataWindow, PBInput, PBWindow, pbSlug } from '../pb'
import './directory-search-window.css'

/* ============================================================================
   MOIS - Search Window — the provider / organization directory.

   PROVENANCE: the Dynamic Form header's Provider drop-down (MOIS test
   environment, 2026-09-25): "Search for:" Name and Group; "Include Type(s):"
   Providers, Org. Roles, Organizations; "Record Status:" Active, Inactive;
   the grid Name / Associated User / Members / Group / Type / Active /
   Practition No. / Payee No. / Payment Type, where an organization or role
   carries a "View Members" link in place of a user; "Save Filter as My
   Default"; Ok, Cancel. The current row is the salmon selection, with the
   `>` row indicator.

   Gaps: what View Members opens and what Save Filter persists were not
   captured; both are inert.
   ========================================================================= */

const TYPES: { type: DirectoryType; label: string }[] = [
  { type: 'PROVIDER', label: 'Providers' },
  { type: 'ORGROLE', label: 'Org. Roles' },
  { type: 'ORGANIZATION', label: 'Organizations' },
]

export function DirectorySearchWindow({ initial, onPick, onClose, zIndex = 99 }: {
  /** the name the calling field holds, selected when the window opens */
  initial?: string
  onPick: (entry: DirectoryEntry) => void
  onClose: () => void
  zIndex?: number
}) {
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [types, setTypes] = useState<Record<DirectoryType, boolean>>({ PROVIDER: true, ORGROLE: true, ORGANIZATION: true })
  const [active, setActive] = useState(true)
  const [inactive, setInactive] = useState(false)
  const [saveFilter, setSaveFilter] = useState(false)
  const rows = useMemo(() => directoryEntries
    .filter((entry) => types[entry.type])
    .filter((entry) => (entry.active !== false ? active : inactive))
    .filter((entry) => entry.name.toUpperCase().includes(name.trim().toUpperCase()))
    .filter((entry) => (entry.group ?? '').toUpperCase().includes(group.trim().toUpperCase()))
    .sort((a, b) => a.name.localeCompare(b.name)), [types, active, inactive, name, group])
  const [cur, setCur] = useState(() => Math.max(0, rows.findIndex((entry) => entry.name === initial)))
  const current = Math.min(cur, Math.max(0, rows.length - 1))
  const row = rows[current]
  // it opens on the name the field holds, scrolled into view (the capture's
  // TECHNICAL SUPPORT row)
  const grid = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!initial) return
    grid.current?.querySelector(`[data-tutorial-id="host.mois.row.directory-${pbSlug(initial)}"]`)?.scrollIntoView({ block: 'center' })
  }, [initial])
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex }}>
      <PBWindow child controls={false} title="MOIS - Search Window" onClose={onClose}
        tutorialId="host.mois.dialog.directory-search" className="pb-directory-search"
        style={{ width: 'min(1080px, 100%)', height: 'min(770px, 100%)' }}>
        <div className="pb-directory-search__filters">
          <div className="pb-directory-search__group">
            <div className="pb-directory-search__caption">Search for:</div>
            <label>Name: <PBInput value={name} onChange={(event) => setName(event.target.value)} w={245} /></label>
            <label>Group: <PBInput value={group} onChange={(event) => setGroup(event.target.value)} w={245} /></label>
          </div>
          <div className="pb-directory-search__group">
            <div className="pb-directory-search__caption">Include Type(s):</div>
            {TYPES.map(({ type, label }) => (
              <PBCheckbox key={type} label={label} checked={types[type]}
                onChange={(next) => setTypes((state) => ({ ...state, [type]: next }))} />
            ))}
          </div>
          <div className="pb-directory-search__group">
            <div className="pb-directory-search__caption">Record Status:</div>
            <PBCheckbox label="Active" checked={active} onChange={setActive} />
            <PBCheckbox label="Inactive" checked={inactive} onChange={setInactive} />
          </div>
        </div>
        <div className="pb-directory-search__grid" ref={grid}>
          <PBDataWindow
            columns={[
              { key: 'name', header: 'Name', width: 250 },
              {
                key: 'associated', header: 'Associated User / Members', width: 196,
                render: (entry) => entry.type === 'PROVIDER'
                  ? entry.associated ?? ''
                  : <span className="pb-directory-search__members">View Members</span>,
              },
              { key: 'group', header: 'Group', width: 182 },
              { key: 'type', header: 'Type', width: 116 },
              { key: 'active', header: 'Active', width: 62, align: 'center', render: (entry) => (entry.active === false ? 'N' : 'Y') },
              { key: 'practitionerNo', header: 'Practition No.', width: 92 },
              { key: 'payeeNo', header: 'Payee No.', width: 72 },
              { key: 'paymentType', header: 'Payment Type' },
            ]}
            rows={rows}
            current={current}
            onCurrentChange={setCur}
            onActivate={(entry) => onPick(entry)}
            rowTutorialId={(entry) => `host.mois.row.directory-${pbSlug(String(entry.name))}`}
            empty="No records match."
          />
        </div>
        <div className="pb-directory-search__footer">
          <PBCheckbox label="Save Filter as My Default" checked={saveFilter} onChange={setSaveFilter} />
          <div className="pb-directory-search__buttons">
            <PBButton disabled={!row} onClick={() => row && onPick(row)} data-tutorial-id="host.mois.command.directory-ok">Ok</PBButton>
            <PBButton onClick={onClose}>Cancel</PBButton>
          </div>
        </div>
      </PBWindow>
    </div>
  )
}
