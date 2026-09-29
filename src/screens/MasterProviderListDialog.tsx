import { PBBand, PBDataWindow, PBTextArea, pbSlug } from '../pb'
import type { PBColumn } from '../pb'
import { MASTER_LOOKUP_COLUMNS, type ClinicRow } from '../data/clinicManagement'
import { useScreenReport } from '../host/screen-state'
import { DemographicModal } from './DemographicDialogs'
import { useClinicRows } from './ClinicEditorWindows'
import { useColumnFilters } from './listKit'
import { LookupPager, usePagedCursor } from './lookupKit'

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
  const { shown: rows, filterRow: filters } = useColumnFilters(
    all,
    MASTER_LOOKUP_COLUMNS.map((c, i) => (i < 4 ? { key: c.key, w: c.width! - 2, anchor: `master-provider-filter-${pbSlug(c.key)}` } : null)),
    { match: 'upper', onChange: () => cursor.setCurrent(0) },
  )
  const cursor = usePagedCursor(rows.length, PAGE)
  const picked = rows[cursor.at]
  useScreenReport({ prompt: 'master-provider-list', row: picked ? `master-provider-${pbSlug(String(picked.name ?? ''))}` : null })

  const columns: PBColumn<ClinicRow>[] = MASTER_LOOKUP_COLUMNS.map((c) => ({
    key: c.key, header: c.header, width: c.width, align: c.align, headAlign: 'center',
  }))
  const ok = () => { if (picked) onPick(String(picked.name ?? ''), picked) }

  return (
    <DemographicModal title="Master Provider List" width={729} height={615} onClose={onClose} dialog="master-provider-list">
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', margin: '8px 8px 0', border: '1px solid #8a8a8a' }}>
        <PBBand>Master Provider List</PBBand>
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', background: '#ffffff' }}>
          <PBDataWindow<ClinicRow>
            rows={rows}
            current={cursor.at}
            onCurrentChange={cursor.setCurrent}
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
      {/* 304741 prints a label from Print Label; the label preview is not built */}
      <LookupPager
        layout="grouped"
        cursor={cursor}
        className="pb-row"
        style={{ gap: 0, padding: '8px 8px 8px', flex: 'none', justifyContent: 'space-between' }}
        navSize={{ width: 75 }}
        pickSize={{ width: 92 }}
        pickGap={20}
        groupGap={2}
        home={{ command: 'master-provider-home' }}
        pgUp={{ command: 'master-provider-pgup' }}
        ok={{ command: 'master-provider-ok', onClick: ok }}
        cancel={{ command: 'master-provider-cancel', onClick: onClose }}
        extra={[{ label: 'Print Label', command: 'master-provider-print-label', size: { width: 86 } }]}
        pgDn={{ command: 'master-provider-pgdwn' }}
        end={{ command: 'master-provider-end' }}
      />
    </DemographicModal>
  )
}
