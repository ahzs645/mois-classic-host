import { PBBand, PBCommandRow, PBDataWindow, PBViewHeader } from '../pb'

/* ============================================================================
   Workspace Summary — what the Workspace module opens on.

   Transcribed from `workspace_summary.PNG`: a Refresh / Change W/S command
   row, then three banded panels. The manual's "Workspace Summary" article
   describes them: the Basket Summary counts what is waiting in each of the
   eight basket folders, split into acknowledgements and reviews; the Task
   List and Message Board summaries count by priority. A folder with nothing
   waiting still shows, with a dash.
   ========================================================================= */

type BasketRow = { item: string; ack: string; review: string }

const BASKET: BasketRow[] = [
  { item: 'Measures', ack: '20', review: '-' },
  { item: 'Imaging', ack: '18', review: '-' },
  { item: 'Consults', ack: '10', review: '-' },
  { item: 'Procedures', ack: '10', review: '-' },
  { item: 'Documents', ack: '10', review: '-' },
  { item: 'Facility Admissions', ack: '6', review: '-' },
  { item: 'Progress Notes', ack: '12', review: '-' },
  { item: 'Orders', ack: '10', review: '-' },
  { item: '', ack: '96', review: '-' },
]

const TASKS = [{ list: 'ADMINISTRATOR (USER)', vhigh: '-', high: '1', med: '2', low: '-' }]
const INCOMPLETE = [{ who: 'ADMINISTRATOR', vhigh: '-', high: '-', med: '-', low: '-' }]
const NEW_MESSAGES = [{ who: 'ADMINISTRATOR', vhigh: '-', high: '-', med: '1', low: '-' }]

const PRIORITY = [
  { key: 'vhigh', header: 'V. High', width: 62, align: 'center' as const },
  { key: 'high', header: 'High', width: 54, align: 'center' as const },
  { key: 'med', header: 'Med.', width: 54, align: 'center' as const },
  { key: 'low', header: 'Low', width: 54, align: 'center' as const },
]

export function WorkspaceSummaryView() {
  return (
    <>
      <PBViewHeader title="Workspace Summary" right={<span>Your Workspace</span>} />
      <PBCommandRow commands={[{ label: 'Refresh' }, { label: 'Change W/S' }]} />
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', padding: 3, gap: 6 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: '0 0 auto' }}>
          <PBBand>Basket Summary</PBBand>
          <div style={{ display: 'flex', height: 190 }}>
            <PBDataWindow
              rows={BASKET}
              gutter={false}
              current={-1}
              columns={[
                { key: 'item', header: 'Item', width: 240 },
                { key: 'ack', header: 'To Acknowledge', width: 150, align: 'right' },
                { key: 'review', header: 'To Review', width: 150, align: 'right' },
                { key: 'pad', header: '' },
              ]}
            />
          </div>
        </div>
        <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, gap: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', minWidth: 0 }}>
            <PBBand>Task List Summary</PBBand>
            <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0 }}>
              <PBDataWindow
                rows={TASKS}
                gutter={false}
                current={-1}
                columns={[{ key: 'list', header: 'Task List', width: 200 }, ...PRIORITY]}
              />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0', minWidth: 0 }}>
            <PBBand>Message Board Summary</PBBand>
            <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0, flexDirection: 'column' }}>
              <PBDataWindow
                rows={INCOMPLETE}
                gutter={false}
                current={-1}
                columns={[{ key: 'who', header: 'Incomplete Messages', width: 200 }, ...PRIORITY]}
              />
              <PBDataWindow
                rows={NEW_MESSAGES}
                gutter={false}
                current={-1}
                columns={[{ key: 'who', header: 'New Messages', width: 200 }, ...PRIORITY]}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
