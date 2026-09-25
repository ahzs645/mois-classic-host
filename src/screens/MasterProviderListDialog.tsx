import { useState } from 'react'
import { PBBand, PBDataWindow, PBInput, PBTextArea, pbSlug } from '../pb'
import type { PBColumn } from '../pb'
import { MASTER_LOOKUP_COLUMNS, type ClinicRow } from '../data/clinicManagement'
import { useScreenReport } from '../host/screen-state'
import { CmdButton } from './CmdButton'
import { DemographicModal } from './DemographicDialogs'
import { useClinicRows } from './ClinicEditorWindows'

/* ============================================================================
   Master Provider List — the lookup.   304741 `6127fb5936f2…` (729x615, 1:1)

   What the "…" beside a letter's Author and Primary Recipient opens (304687:
   Paste Provider Data "Opens the Master Provider List to select a
   provider"), and what Utilities ▸ Provider Address to Clipboard opens in
   304741. Not the Administration screen: a modal with a grey `Master
   Provider List` band, four filter boxes over Provider / Provider Ref / City
   / Spec. Code, the grid, a note box, and a bottom row of Home / PgUp,
   Ok / Cancel, Print Label / PgDwn / End.

   The rows are Administration ▸ External Service Providers ▸ Providers' —
   this session's, so a doctor added there with New Record is here too.

   The command anchors carry a `master-provider-` prefix: this window opens
   over Letter Setup, whose own Cancel is `host.mois.command.cancel` and comes
   first in the page, so a bare `cancel` would press the wrong window's button.
   It reports `host.screen.prompt = master-provider-list` rather than only
   `host.dialog`, because over Letter Setup the frame's own dialog wins that
   path.
   ========================================================================= */

const PAGE = 20

export function MasterProviderListDialog({ onPick, onClose }: {
  /** Ok or a double-click: the chosen provider's name */
  onPick: (name: string, row: ClinicRow) => void
  onClose: () => void
}) {
  const [all] = useClinicRows('ad-providers')
  const [filter, setFilter] = useState<Record<string, string>>({})
  const [cur, setCur] = useState(0)
  const rows = all.filter((r) => Object.entries(filter).every(([k, v]) => !v || String(r[k] ?? '').toUpperCase().includes(v.toUpperCase())))
  const current = Math.min(cur, Math.max(0, rows.length - 1))
  const picked = rows[current]
  useScreenReport({ prompt: 'master-provider-list', row: picked ? `master-provider-${pbSlug(String(picked.name ?? ''))}` : null })

  const columns: PBColumn<ClinicRow>[] = MASTER_LOOKUP_COLUMNS.map((c) => ({
    key: c.key, header: c.header, width: c.width, align: c.align, headAlign: 'center',
  }))
  const filters = MASTER_LOOKUP_COLUMNS.map((c, i) => (i < 4
    ? (
      <PBInput
        key={c.key}
        w={c.width! - 2}
        value={filter[c.key] ?? ''}
        onChange={(e) => { setFilter({ ...filter, [c.key]: e.target.value }); setCur(0) }}
        data-tutorial-id={`host.mois.field.master-provider-filter-${pbSlug(c.key)}`}
      />
    )
    : null))
  const move = (to: number) => setCur(Math.max(0, Math.min(rows.length - 1, to)))
  const ok = () => { if (picked) onPick(String(picked.name ?? ''), picked) }
  const btn = (label: string, onClick?: () => void, w = 75) => (
    <CmdButton command={`master-provider-${pbSlug(label)}`} style={{ width: w }} onClick={onClick}>{label}</CmdButton>
  )

  return (
    <DemographicModal title="Master Provider List" width={729} height={615} onClose={onClose} dialog="master-provider-list">
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', margin: '8px 8px 0', border: '1px solid #8a8a8a' }}>
        <PBBand>Master Provider List</PBBand>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#ffffff' }}>
          <PBDataWindow<ClinicRow>
            rows={rows}
            current={current}
            onCurrentChange={setCur}
            onActivate={(r) => onPick(String(r.name ?? ''), r)}
            columns={columns}
            filters={filters}
            rowTutorialId={(r) => `host.mois.row.master-provider-${pbSlug(String(r.name ?? ''))}`}
            style={{ ['--pb-band' as string]: '#ffffff' }}
            empty="No providers match."
          />
        </div>
        {/* the capture's note box under the grid; what fills it is not
            documented, so it is drawn empty */}
        <PBTextArea rows={4} w="100%" readOnly style={{ flex: 'none', borderLeft: 0, borderRight: 0, borderBottom: 0 }} />
      </div>
      <div className="pb-row" style={{ gap: 0, padding: '8px 8px 8px', flex: 'none', justifyContent: 'space-between' }}>
        <span className="pb-row" style={{ gap: 2 }}>
          {btn('Home', () => move(0))}
          {btn('PgUp', () => move(current - PAGE))}
        </span>
        <span className="pb-row" style={{ gap: 20 }}>
          {btn('Ok', ok, 92)}
          {btn('Cancel', onClose, 92)}
        </span>
        <span className="pb-row" style={{ gap: 2 }}>
          {/* 304741 prints a label from here; the label preview is not built */}
          {btn('Print Label', undefined, 86)}
          {btn('PgDwn', () => move(current + PAGE))}
          {btn('End', () => move(rows.length - 1))}
        </span>
      </div>
    </DemographicModal>
  )
}
