import { useMemo, useState } from 'react'
import {
  PBBand, PBButton, PBCheckbox, PBDataWindow, PBInput, PBLookup, PBRadio, PBSelect, PBWindow,
} from '../pb'
import { usePatient } from '../data/patient-context'
import {
  serviceCodeRows, universalCodeSystems, universalReferenceSets, universalSearchRows,
  type ServiceCodeRow, type UniversalSearchRow,
} from '../data/encounterPickers'

/* ============================================================================
   The two code lookups the encounter header's `…` buttons open.

   Both are pickers rather than screens: they return a code to the field that
   opened them and MOIS closes them on the pick. They are separate PowerBuilder
   windows, not one parameterised one — the Universal Search Window carries the
   chart in its caption and can file its pick straight onto the chart, which is
   what its third button does.
   ========================================================================= */

/* ---------------------------------------------------------------------------
   MOIS - Universal Search Window: the Health Issues `…`.

   A search over every enabled code system at once. The three panes across the
   top are the search's parameters, the salmon `Search For` box its text, and
   the pane at the bottom prints the current term's alternates.
   ------------------------------------------------------------------------ */
export function UniversalSearchDialog({ onPick, onClose }: {
  /** Select — hands the term back to the field that opened the window */
  onPick: (row: UniversalSearchRow, addHealthIssue?: boolean) => void
  onClose: () => void
}) {
  const patient = usePatient()
  const [systems, setSystems] = useState<string[]>(universalCodeSystems)
  const [sets, setSets] = useState<string[]>([])
  const [scope, setScope] = useState('Code Systems')
  const [code, setCode] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('Active')
  const [limit, setLimit] = useState('200')
  const [search, setSearch] = useState('')
  const [cur, setCur] = useState(0)

  /* `Search` is a round trip in MOIS; here the grid just narrows as the
     parameters change, which is the same result for a training chart. */
  const rows = useMemo(() => universalSearchRows.filter((r) => (
    systems.includes(r.system)
    && r.term.toUpperCase().includes(search.trim().toUpperCase())
    && r.code.toUpperCase().includes(code.trim().toUpperCase())
    && r.category.toUpperCase().includes(category.trim().toUpperCase())
  )).slice(0, Math.max(0, Number(limit) || 0)), [systems, search, code, category, limit])

  const row = rows[Math.min(cur, rows.length - 1)]

  const toggle = (list: string[], set: (v: string[]) => void, value: string) => (
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  )

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 95 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.universal-search"
        title={`MOIS - Universal Search Window for Chart Number: ${patient.chart} ${patient.first} ${patient.last}`}
        onClose={onClose}
        style={{ width: 'min(1000px, 100%)', height: 'min(720px, 100%)' }}
      >
        {/* ---- the three parameter panes ---------------------------------- */}
        <div style={{ display: 'flex', flex: 'none', borderBottom: '1px solid var(--pb-border)' }}>
          <CheckPane
            title="Select from Code System(s)"
            w={258}
            items={universalCodeSystems}
            checked={systems}
            onToggle={(v) => toggle(systems, setSystems, v)}
            onAll={() => setSystems(universalCodeSystems)}
            onClear={() => setSystems([])}
            /* MOIS lists the systems this site has licensed and leaves a
               greyed `More…` row for the ones it has not */
            more
          />
          <CheckPane
            title="Filter to Reference Set(s)"
            w={280}
            items={universalReferenceSets}
            checked={sets}
            onToggle={(v) => toggle(sets, setSets, v)}
            onAll={() => setSets(universalReferenceSets)}
            onClear={() => setSets([])}
          />
          <div style={{ flex: '1 1 auto', minWidth: 0, padding: '3px 6px' }}>
            <div className="pb-row" style={{ gap: 6, marginBottom: 3 }}>
              <strong>Parameters:</strong>
              <span style={{ color: 'var(--pb-ink-dim)' }}>Select from</span>
              {['Code Systems', 'Health Issues', 'Encounter History'].map((s) => (
                <PBRadio
                  key={s}
                  name="universal-scope"
                  label={s}
                  checked={scope === s}
                  onChange={() => setScope(s)}
                />
              ))}
            </div>
            <div className="pb-row" style={{ gap: 4, marginBottom: 2, justifyContent: 'flex-end' }}>
              <span>Code is</span>
              <PBInput w={186} value={code} onChange={(e) => setCode(e.target.value)} />
              <span style={{ flex: '1 1 auto' }} />
            </div>
            <div className="pb-row" style={{ gap: 4, marginBottom: 2 }}>
              <span style={{ flex: '0 0 auto' }}>Category is like</span>
              <PBInput
                style={{ flex: '1 1 auto', minWidth: 0 }}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div className="pb-row" style={{ gap: 6, marginBottom: 2 }}>
              <span>Status is</span>
              {['Active', 'Inactive', 'Either'].map((s) => (
                <PBRadio
                  key={s}
                  name="universal-status"
                  label={s}
                  checked={status === s}
                  onChange={() => setStatus(s)}
                />
              ))}
            </div>
            <div className="pb-row" style={{ gap: 4 }}>
              <span>Limit list to</span>
              <PBInput w={76} value={limit} onChange={(e) => setLimit(e.target.value)} />
              <span>records</span>
            </div>
          </div>
        </div>

        {/* ---- the search strip ------------------------------------------- */}
        <div className="pb-row" style={{ gap: 4, padding: '3px 4px', flex: 'none' }}>
          <span style={{ color: 'var(--pb-link)' }}>Search For:</span>
          <PBLookup
            /* the salmon box: MOIS paints the field the search runs from the
               same colour it paints a current row */
            w="100%"
            value={search}
            onChange={setSearch}
            name="universal-search"
          />
          <PBButton style={{ minWidth: 90 }} data-tutorial-id="host.mois.command.search">Search</PBButton>
        </div>

        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 4px' }}>
          <PBDataWindow
            columns={[
              { key: 'term', header: 'Term' },
              { key: 'category', header: 'Category', width: 200 },
              { key: 'code', header: 'Code', width: 120 },
              { key: 'system', header: 'Code System', width: 180 },
            ]}
            rows={rows}
            current={Math.min(cur, Math.max(0, rows.length - 1))}
            onCurrentChange={setCur}
            onActivate={(r) => onPick(r)}
            empty="No term matches those parameters."
          />
        </div>
        {/* the count MOIS prints under the list is the limit it asked for */}
        <div style={{ padding: '2px 8px', flex: 'none', color: 'var(--pb-ink-dim)' }}>
          Rows: {limit}
        </div>

        <div style={{ flex: 'none' }}>
          <PBBand>{`Alternate Terms      [${row?.alternates.length ?? 0}]`}</PBBand>
          <div style={{ height: 74, padding: '3px 6px', background: '#fff', borderBottom: '1px solid var(--pb-border)' }}>
            {row?.alternates.map((a) => <div key={a}>{a}</div>)}
          </div>
        </div>

        <div className="pb-row" style={{ padding: '8px 6px', gap: 10, flex: 'none' }}>
          <PBButton style={{ minWidth: 172 }}>Save My Default Settings</PBButton>
          <PBButton style={{ minWidth: 172 }}>Restore System Settings</PBButton>
          <span style={{ flex: '1 1 auto' }} />
          <PBButton
            style={{ minWidth: 118 }}
            disabled={!row}
            data-tutorial-id="host.mois.command.select-term"
            onClick={() => row && onPick(row)}
          >
            Select
          </PBButton>
          <PBButton style={{ minWidth: 118 }} onClick={onClose}>Cancel</PBButton>
          <span style={{ flex: '1 1 auto' }} />
          <PBButton
            style={{ minWidth: 186 }}
            disabled={!row}
            /* the one button that writes: it files the term as a health issue
               on the chart as well as returning it to the field */
            onClick={() => row && onPick(row, true)}
          >
            Select &amp; Add Health Issue
          </PBButton>
        </div>
      </PBWindow>
    </div>
  )
}

/** One of the two checkbox panes across the top of the Universal Search Window. */
function CheckPane({ title, w, items, checked, onToggle, onAll, onClear, more }: {
  title: string
  w: number
  items: string[]
  checked: string[]
  onToggle: (v: string) => void
  onAll: () => void
  onClear: () => void
  more?: boolean
}) {
  return (
    <div style={{ width: w, flex: 'none', borderRight: '1px solid var(--pb-border)' }}>
      <div className="pb-band" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ flex: '1 1 auto', minWidth: 0 }}>{title}</span>
        <button className="pb-link" onClick={onAll}>All</button>
        <button className="pb-link" onClick={onClear}>Clear</button>
      </div>
      <div style={{ height: 84, overflowY: 'auto', background: '#fff' }}>
        {items.map((name, i) => (
          <div key={name} style={{ padding: '1px 5px', background: i % 2 ? '#eeeee4' : '#fff' }}>
            <PBCheckbox
              label={name}
              checked={checked.includes(name)}
              onChange={() => onToggle(name)}
            />
          </div>
        ))}
        {more && <div style={{ padding: '1px 5px', color: 'var(--pb-ink-dim)' }}>More…</div>}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Advanced Lookup Service ▸ Master Service Code List: the Services `…`.

   The same window class as the Patient Chart List — band, list, description
   pane, Home/PgUp/Ok/Cancel/PgDwn/End — bound to the fee schedule instead of
   the roster. It filters from one `Search For` box rather than a box per
   column, and carries a Source / Save on Close strip under the buttons.
   ------------------------------------------------------------------------ */
const PAGE = 12

export function ServiceCodeLookupDialog({ onPick, onClose }: {
  onPick: (row: ServiceCodeRow) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [source, setSource] = useState('ALL')
  const [saveOnClose, setSaveOnClose] = useState(false)
  const [cur, setCur] = useState(0)

  const rows = useMemo(() => {
    const want = search.trim().toUpperCase()
    if (!want) return serviceCodeRows
    return serviceCodeRows.filter((r) => (
      r.description.toUpperCase().includes(want) || r.code.toUpperCase().includes(want)
    ))
  }, [search])

  const row = rows[Math.min(cur, rows.length - 1)]
  const step = (delta: number) => setCur((i) => Math.max(0, Math.min(rows.length - 1, i + delta)))

  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 95 }}>
      <PBWindow
        child
        controls={false}
        tutorialId="host.mois.dialog.service-code-lookup"
        title="Advanced Lookup Service"
        onClose={onClose}
        style={{ width: 'min(1000px, 100%)', height: 'min(720px, 100%)' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, padding: 8, gap: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, border: '1px solid var(--pb-border)' }}>
            <div className="pb-band--ruled"><PBBand>Master Service Code List</PBBand></div>
            <div className="pb-row" style={{ gap: 4, padding: '3px 4px', flex: 'none' }}>
              <span style={{ color: 'var(--pb-link)' }}>Search For:</span>
              <PBLookup w="100%" value={search} onChange={setSearch} name="service-code-search" />
              <span>Status:</span>
              <PBSelect
                w={92}
                options={['ALL', 'Active', 'Inactive']}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
            </div>
            <PBDataWindow
              flush
              rules="white"
              style={{ flex: '1 1 auto', minHeight: 0 }}
              columns={[
                { key: 'code', header: 'Code', width: 86, align: 'center' },
                { key: 'description', header: 'Description' },
                { key: 'msp', header: 'MSP', width: 78, align: 'right' },
                { key: 'wcb', header: 'WCB', width: 78, align: 'right' },
                { key: 'private', header: 'Private', width: 82, align: 'right' },
                { key: 'system', header: 'Code System', width: 108 },
                { key: 'category', header: 'Category', width: 128 },
                { key: 'type', header: 'Type', width: 88 },
              ]}
              rows={rows}
              current={Math.min(cur, Math.max(0, rows.length - 1))}
              onCurrentChange={setCur}
              onActivate={(r) => onPick(r)}
              empty="No service code matches."
            />
          </div>

          <div
            className="pb-field"
            style={{ height: 96, flex: 'none', padding: '3px 5px', background: '#fff' }}
          >
            This is the master service code selection list
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flex: 'none' }}>
            <PBButton wide onClick={() => setCur(0)}>Home</PBButton>
            <PBButton wide onClick={() => step(-PAGE)}>PgUp</PBButton>
            <span style={{ flex: '1 1 auto' }} />
            <PBButton
              wide
              className="pb-btn--default"
              disabled={!row}
              data-tutorial-id="host.mois.command.pick-service-code"
              onClick={() => row && onPick(row)}
            >
              Ok
            </PBButton>
            <span style={{ width: 14 }} />
            <PBButton wide onClick={onClose}>Cancel</PBButton>
            <span style={{ flex: '1 1 auto' }} />
            <PBButton wide onClick={() => step(PAGE)}>PgDwn</PBButton>
            <PBButton wide onClick={() => setCur(rows.length - 1)}>End</PBButton>
          </div>

          {/* the strip the Patient Chart List does not have */}
          <div className="pb-row" style={{ gap: 10, flex: 'none' }}>
            <span>Source:</span>
            <PBSelect
              w={200}
              options={['ALL', 'BCMSPFEE', 'BCMAFEE', 'USER']}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
            <PBCheckbox label="Save on Close" checked={saveOnClose} onChange={setSaveOnClose} />
          </div>
        </div>
      </PBWindow>
    </div>
  )
}
