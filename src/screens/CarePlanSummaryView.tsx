import { useMemo, useState } from 'react'
import { PBCommandRow, PBDataWindow, PBIdentityStrip, PBTabs, PBViewHeader } from '../pb'
import { useChartExport } from '../data/chart-records'
import { CARE_PLAN_ACCENT, CARE_PLAN_DEFAULT_ACCENT, CARE_PLAN_SECTIONS, carePlanRows } from '../data/carePlanRows'
import { deleteCarePlanSnapshot, useChartSession } from '../data/chartSession'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import type { ChartScreen } from '../data/chartScreens'
import { useScreenReport } from '../host/screen-state'
import { useOpenWindow } from './areaWindowRegistry'

/* ============================================================================
   The Care Plan summary (art. 303472).

   Current Care Plan is the consolidated view MOIS gathers from the chart —
   preferences, goals, planned actions, the three Health Issues folders, long
   term medications, reaction risks and anything tagged to the plan, all
   sensitive records excluded — banded by section with a `[n]` count
   (`7abec7c5…`, `3d93f580…`). Rows come from the open chart's export via
   data/carePlanRows.ts, not from the frame's generic row map.

   Care Plan Snapshot is `ede59df4…`: an upper Date / Created By / Note grid
   and, under it, the fixed-pitch text of the plan as it stood — "CARE PLAN AS
   OF … FOR:". Delete Snapshot is enabled once a snapshot row is selected.

   Create Snapshot, Distribute... and the blue Print link each start with the
   Report Letterhead window (screens/CarePlanWindows.tsx).
   ========================================================================= */
export function CarePlanSummaryView({ screen }: { screen: ChartScreen }) {
  const patient = usePatient()
  const data = useChartExport()
  const session = useChartSession(patient.chart)
  const openWindow = useOpenWindow()
  const [tab, setTab] = useState('Current Care Plan')
  const rows = useMemo(() => carePlanRows(data, session.tags), [data, session.tags])
  const groups = CARE_PLAN_SECTIONS.filter((s) => rows.some((r) => r.section === s))
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const [snap, setSnap] = useState(0)
  const snapshots = session.snapshots
  const current = snapshots[snap]
  /* whether this chart has a snapshot / a tagged record at all: a lesson
     grades "you saved one", which a replay in the same frame must not break */
  useScreenReport({ carePlanRows: rows.length, carePlanSnapshots: snapshots.length > 0, carePlanTags: session.tags.length > 0 })

  const onSnapshotTab = tab === 'Care Plan Snapshot'
  const commands = screen.commands.map((label) => label ? ({
    label,
    disabled: label === 'Delete Snapshot' ? !(onSnapshotTab && current) : screen.disabled?.includes(label),
    onClick: label === 'Create Snapshot' ? () => openWindow('report-letterhead', { purpose: 'snapshot' })
      : label === 'Distribute...' ? () => openWindow('report-letterhead', { purpose: 'distribute' })
      : label === 'Delete Snapshot' ? () => { deleteCarePlanSnapshot(patient.chart, snap); setSnap(0) }
      : label === 'Refresh' ? () => setCollapsed(new Set())
      : undefined,
  }) : null)

  return <>
    <PBViewHeader title="Care Plan" right={<ChartHeaderIdentity />} />
    <PBCommandRow commands={commands} />
    <PBIdentityStrip fields={[
      { label: 'FIRST:', value: patient.first }, { label: 'MIDDLE:', value: patient.middle },
      { label: 'LAST:', value: patient.last }, { label: 'DoB:', value: patient.dob },
    ]} encounter="NO ENCOUNTER" />
    <div style={{ flex: 1, minHeight: 0, display: 'flex', padding: '3px' }}>
      <PBTabs tabs={['Current Care Plan', 'Care Plan Snapshot']} active={tab} onChange={setTab} compact face>
        {!onSnapshotTab ? <div className="pb-care-summary">
          <div className="pb-row" style={{ padding: '3px 6px', gap: 22, flex: 'none' }}>
            <button className="pb-link" data-tutorial-id="host.mois.command.expand-all" onClick={() => setCollapsed(new Set())}>Expand All</button>
            <button className="pb-link" data-tutorial-id="host.mois.command.collapse-all" onClick={() => setCollapsed(new Set(groups))}>Collapse All</button>
            <span className="pb-row__spacer" />
            <button className="pb-link" data-tutorial-id="host.mois.command.copy-to-clipboard">Copy to Clipboard</button>
            <button
              className="pb-link"
              data-tutorial-id="host.mois.command.print-care-plan"
              onClick={() => openWindow('report-letterhead', { purpose: 'print' })}
            >
              Print
            </button>
          </div>
          <PBDataWindow flush gutter={false} rules={false} head="grey" wrap
            columns={[
              { key: 'date', header: 'Date', width: 80 },
              {
                key: 'description', header: 'Description', width: 340,
                render: (r) => (
                  <span>
                    {r.description}
                    {r.comment && <span style={{ display: 'block', fontFamily: '"Lucida Console", monospace' }}>Comments:<br />{r.comment}</span>}
                  </span>
                ),
              },
              { key: 'detail', header: 'Detail' },
              { key: 'link', header: 'Hyperlink', width: 70, align: 'center', render: () => <span style={{ color: '#1f5fbf', fontWeight: 700 }}>{'↪'}</span> },
            ]}
            rows={rows}
            groups={groups} groupBy={(row) => row.section} groupLabel={(id, records) => `${id}  [${records.length}]`}
            groupTutorialId={(g) => `host.mois.group.care-plan-${g.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            groupAccent={(g) => CARE_PLAN_ACCENT[g] ?? CARE_PLAN_DEFAULT_ACCENT} collapsed={collapsed} onCollapsedChange={setCollapsed}
            empty="No care plan records on file." />
        </div> : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
            <div style={{ height: 200, flex: 'none', display: 'flex' }} data-tutorial-id="host.mois.group.care-plan-snapshots">
              <PBDataWindow
                columns={[
                  { key: 'date', header: 'Date', width: 90, align: 'center' },
                  { key: 'createdBy', header: 'Created By', width: 150 },
                  { key: 'note', header: 'Note', width: 490 },
                ]}
                rows={snapshots}
                current={snap}
                onCurrentChange={setSnap}
                rowTutorialId={(_, i) => `host.mois.row.care-plan-snapshot-${i}`}
                empty=" "
              />
            </div>
            <pre
              data-tutorial-id="host.mois.field.care-plan-snapshot-text"
              style={{
                flex: '1 1 auto', minHeight: 0, overflow: 'auto', margin: 0, padding: '4px 6px',
                borderTop: '1px solid #9a9a9a', background: 'var(--pb-face)',
                fontFamily: '"Lucida Console", "DejaVu Sans Mono", monospace', fontSize: 11,
                /* fixed-pitch columns: undo the kit text mode's wider word gaps */
                wordSpacing: 'normal', letterSpacing: 'normal',
              }}
            >
              {current?.text ?? ''}
            </pre>
          </div>
        )}
      </PBTabs>
    </div>
  </>
}
