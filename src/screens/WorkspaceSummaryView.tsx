import { PBBand, PBCommandRow, PBDataWindow } from '../pb'
import { workspaceSummary } from '../data/workspaceLists'
import { useWorkspaceStore } from '../data/workspaceStore'
import { useOpenWindow } from './areaWindowRegistry'
import { WorkspaceBanner } from './WorkspaceBanner'

/* ============================================================================
   Workspace Summary — what the Workspace module opens on.

   Transcribed from `workspace_summary.PNG` and the manual's 303599 image
   `74b97af2` / 301166 image `e3ec97d1`: a Refresh / Change W/S command row,
   then three banded panels. The manual's "Workspace Summary" article
   describes them: the Basket Summary counts what is waiting in each of the
   eight basket folders, split into acknowledgements (To Acknowledge) and
   reviews (To Review) — the A and R of the folders' T column; the Task List
   and Message Board summaries count by priority. A folder with nothing
   waiting still shows, with a dash.

   The counts are derived from the folders themselves (data/workspaceLists),
   so following a number into its folder finds that many rows.
   ========================================================================= */

const PRIORITY = [
  { key: 'vhigh', header: 'V. High', width: 62, align: 'center' as const },
  { key: 'high', header: 'High', width: 54, align: 'center' as const },
  { key: 'med', header: 'Med.', width: 54, align: 'center' as const },
  { key: 'low', header: 'Low', width: 54, align: 'center' as const },
]

export function WorkspaceSummaryView() {
  const ws = useWorkspaceStore()
  const openWindow = useOpenWindow()
  const summary = workspaceSummary(ws)
  return (
    <>
      <WorkspaceBanner title="Workspace Summary" />
      <PBCommandRow commands={[
        { label: 'Refresh' },
        { label: 'Change W/S', onClick: () => { openWindow('change-workspace') } },
      ]} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: 3, gap: 6 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '0 0 auto' }} data-tutorial-id="host.mois.field.basket-summary">
          <PBBand>Basket Summary</PBBand>
          {/* nine rows — eight folders and the total — at the grid's pitch */}
          <div style={{ display: 'flex', height: 222 }}>
            <PBDataWindow
              rows={summary.basket}
              gutter={false}
              current={-1}
              rowTutorialId={(r) => (r.item ? `host.mois.row.summary-${r.item.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : 'host.mois.row.summary-total')}
              columns={[
                { key: 'item', header: 'Item', width: 240 },
                { key: 'ack', header: 'To Acknowledge', width: 150, align: 'right', render: (r) => (r.item ? r.ack : <b>{r.ack}</b>) },
                { key: 'review', header: 'To Review', width: 150, align: 'right' },
                { key: 'pad', header: '' },
              ]}
            />
          </div>
        </div>
        <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, gap: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', minWidth: 0 }} data-tutorial-id="host.mois.field.task-summary">
            <PBBand>Task List Summary</PBBand>
            <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0 }}>
              <PBDataWindow
                rows={summary.tasks}
                gutter={false}
                current={-1}
                columns={[{ key: 'list', header: 'Task List', width: 168 }, ...PRIORITY]}
              />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', minWidth: 0 }} data-tutorial-id="host.mois.field.message-summary">
            <PBBand>Message Board Summary</PBBand>
            <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, flexDirection: 'column' }}>
              <PBDataWindow
                rows={summary.incomplete}
                gutter={false}
                current={-1}
                columns={[{ key: 'who', header: 'Incomplete Messages', width: 168 }, ...PRIORITY]}
              />
              <PBDataWindow
                rows={summary.fresh}
                gutter={false}
                current={-1}
                columns={[{ key: 'who', header: 'New Messages', width: 168 }, ...PRIORITY]}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
