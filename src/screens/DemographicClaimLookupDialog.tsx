import { useMemo, useState } from 'react'
import { INCENTIVE_DIAG_CODES, INCENTIVE_FEE_CODES, type ClaimLookupRow } from '../data/demographic-claim-lookups'
import { PBBand, PBDataWindow, PBInput, pbSlug } from '../pb'
import { DemographicModal } from './DemographicDialogs'
import { DialogButton } from './WorkspaceDialogFrame'

/* ============================================================================
   Advanced Lookup Service over the Incentives tab's code columns: the "…"
   (or F4) beside Fee Code Description and beside Diag Code.

   PROVENANCE: art. 301149 "Incentive Claims" — "Fee Code: Press F4 to view
   and select from the fee code options", "Diag Code: Press F4 to view and
   select from the list of ICD-9 diagnostic codes", "Fee Code Description:
   This will appear automatically once the fee code has been selected".
   `a0c45e54…png` shows the "…" columns but not the window they open.

   INFERRED: the window itself. It is drawn as the Advanced Lookup Service the
   WCB tab's Area of Injury "…" opens (user capture 2026-09-25 #29,
   screens/WcbLookupWindows.tsx) — band, salmon Search For box, Code /
   Description / Category grid, Ok and Cancel — since that is the lookup
   class MOIS puts behind a code column's "…".

   Anchors: `host.mois.dialog.incentive-fee-code-lookup` /
   `incentive-diag-code-lookup`, the search box `host.mois.field.<slug>-search`,
   rows `host.mois.row.<slug>-<code>`, buttons `host.mois.command.<slug>-ok` /
   `-cancel`. Reported as `host.dialog` = the slug while open.
   ========================================================================= */

export type IncentiveLookupKind = 'fee' | 'diag'

const SETS: Record<IncentiveLookupKind, { band: string; slug: string; rows: ClaimLookupRow[] }> = {
  fee: { band: 'Incentive Fee Codes', slug: 'incentive-fee-code-lookup', rows: INCENTIVE_FEE_CODES },
  diag: { band: 'Diagnostic Codes (ICD-9)', slug: 'incentive-diag-code-lookup', rows: INCENTIVE_DIAG_CODES },
}

export function IncentiveCodeLookupDialog({ kind, initial = '', onPick, onClose }: {
  kind: IncentiveLookupKind
  /** what the cell held: the search starts from it */
  initial?: string
  onPick: (row: ClaimLookupRow) => void
  onClose: () => void
}) {
  const set = SETS[kind]
  const [search, setSearch] = useState(initial)
  const [cur, setCur] = useState(0)
  const rows = useMemo(() => {
    const want = search.trim().toUpperCase()
    return want ? set.rows.filter((r) => r.code.startsWith(want) || r.description.toUpperCase().includes(want)) : set.rows
  }, [search, set])
  const at = Math.min(cur, Math.max(0, rows.length - 1))
  const row = rows[at]
  return (
    <DemographicModal title="Advanced Lookup Service" width={620} height={520} onClose={onClose} dialog={set.slug}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '8px 8px 0' }}>
        <div style={{ border: '1px solid #a0a0a0', background: '#fff', display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
          <PBBand><b>{set.band}</b></PBBand>
          <div className="pb-row" style={{ gap: 4, padding: '2px 4px', flex: 'none' }}>
            <span style={{ color: 'var(--pb-link)' }}>Search For:</span>
            <PBInput
              w="100%"
              aria-label={`${set.band} search`}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCur(0) }}
              onKeyDown={(e) => { if (e.key === 'Enter' && row) { e.preventDefault(); onPick(row) } }}
              style={{ flex: '1 1 auto', background: '#f4caa8' }}
              data-tutorial-id={`host.mois.field.${set.slug}-search`}
            />
          </div>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }}>
            <PBDataWindow
              flush
              rules="white"
              columns={[
                { key: 'code', header: 'Code', width: 90, headAlign: 'center' },
                { key: 'description', header: 'Description', headAlign: 'center' },
                { key: 'category', header: 'Category', width: 110, headAlign: 'center' },
              ]}
              rows={rows}
              current={at}
              onCurrentChange={setCur}
              onActivate={(r) => onPick(r)}
              rowTutorialId={(r) => `host.mois.row.${set.slug}-${pbSlug(r.code)}`}
              empty="No code matches."
            />
          </div>
        </div>
      </div>
      <div className="pb-row" style={{ justifyContent: 'center', gap: 22, padding: '10px 8px', flex: 'none' }}>
        <DialogButton id={`${set.slug}-ok`} width={74} isDefault disabled={!row} onClick={() => row && onPick(row)}>Ok</DialogButton>
        <DialogButton id={`${set.slug}-cancel`} width={74} onClick={onClose}>Cancel</DialogButton>
      </div>
    </DemographicModal>
  )
}
