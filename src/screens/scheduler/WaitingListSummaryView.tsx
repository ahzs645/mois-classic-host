import { useState } from 'react'
import { PBDataWindow, PBViewHeader, pbSlug } from '../../pb'
import { registerConfirmCurrent } from '../../host/confirmCurrent'

/** Scheduler > Waiting List, documented in Mois/references/scheduler.md.
 * The archive describes this distinct summary, not the Provider Lists editor.
 * No local export supplies owner/list aggregates. Keep those absent rather than
 * attributing the ownerless Provider Lists demonstration rows to a provider.
 * Geometry and ordering require a current screenshot; no action was recorded.
 */
registerConfirmCurrent([{
  target: { node: 'waiting' },
  source: '~/github/Mois/references/scheduler.md (Waiting List Summary, text only)',
  check: 'layout, column widths, ordering, and owner/list aggregation contract',
}])

export type WaitingListSummaryRow = {
  provider: string
  waitList: string
  patientCount: number
  minimumDays: number | null
  averageDays: number | null
  maximumDays: number | null
}

export function WaitingListSummaryView({ rows = [] }: { rows?: WaitingListSummaryRow[] }) {
  const [current, setCurrent] = useState(0)
  /* Text-only source: wrap provisional captions locally to keep every word
     readable at the standard pane width; actual header geometry is uncaptured. */
  const timeHeader = (aggregate: string) => <span style={{ display: 'block', whiteSpace: 'normal', lineHeight: '13px', padding: '2px 0' }}>Wait Time Overview (days)<br />{aggregate}</span>
  return <>
    <PBViewHeader title="Waiting List Summary" />
    <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, padding: 3 }} data-tutorial-id="host.mois.group.waiting-list-summary">
      <PBDataWindow rows={rows} current={current} onCurrentChange={setCurrent} gutter={false}
        rowTutorialId={(row) => `host.mois.row.wait-summary-${pbSlug(row.provider)}-${pbSlug(row.waitList)}`}
        columns={[
          { key: 'provider', header: 'PROVIDER', width: 200 },
          { key: 'waitList', header: 'Wait List', width: 180 },
          { key: 'patientCount', header: 'Patient Count', width: 82, align: 'right' },
          { key: 'minimumDays', header: timeHeader('Min.'), width: 100, align: 'right' },
          { key: 'averageDays', header: timeHeader('Avg.'), width: 100, align: 'right' },
          { key: 'maximumDays', header: timeHeader('Max.'), width: 100, align: 'right' },
        ]} empty={false} />
    </div>
  </>
}
