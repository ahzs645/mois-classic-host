import { useState } from 'react'
import { PBCommandRow, PBDataWindow, PBIdentityStrip, PBTabs, PBViewHeader } from '../pb'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import type { ChartScreen } from '../data/chartScreens'

/** The Care Plan overview is a grouped summary, not a record/detail editor.
 * Keep the supplied chart rows; the visual audit does not establish care-plan
 * membership for records in other folders. */
export function CarePlanSummaryView({ screen }: { screen: ChartScreen }) {
  const patient = usePatient()
  const [tab, setTab] = useState('Current Care Plan')
  const rows = (screen.rows ?? []).map((row) => ({ ...row, section: row.section ?? 'GOALS' }))
  const groups = [...new Set(rows.map((row) => row.section))]
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(groups))
  return <>
    <PBViewHeader title="Care Plan" right={<ChartHeaderIdentity />} />
    <PBCommandRow commands={screen.commands.map((label) => label ? ({ label, disabled: screen.disabled?.includes(label) }) : null)} />
    <PBIdentityStrip fields={[
      { label: 'FIRST:', value: patient.first }, { label: 'MIDDLE:', value: patient.middle },
      { label: 'LAST:', value: patient.last }, { label: 'DoB:', value: patient.dob },
    ]} encounter="NO ENCOUNTER" />
    <div style={{ flex: 1, minHeight: 0, display: 'flex', padding: '3px' }}>
      <PBTabs tabs={['Current Care Plan', 'Care Plan Snapshot']} active={tab} onChange={setTab} compact face>
        {tab === 'Current Care Plan' ? <div className="pb-care-summary">
          <div className="pb-row" style={{ padding: '3px 6px', gap: 22, flex: 'none' }}>
            <button className="pb-link" onClick={() => setCollapsed(new Set())}>Expand All</button>
            <button className="pb-link" onClick={() => setCollapsed(new Set(groups))}>Collapse All</button>
            <span className="pb-row__spacer" />
            <button className="pb-link">Copy to Clipboard</button><button className="pb-link">Print</button>
          </div>
          <PBDataWindow flush gutter={false} rules={false} head="grey" columns={screen.columns} rows={rows}
            groups={groups} groupBy={(row) => row.section} groupLabel={(id, records) => `${id}  [${records.length}]`}
            groupAccent={() => '#d3e1fb'} collapsed={collapsed} onCollapsedChange={setCollapsed} empty=" " />
        </div> : <PBDataWindow columns={[{ key: 'date', header: 'Date', width: 140 }, { key: 'description', header: 'Description' }]} rows={[]} empty=" " />}
      </PBTabs>
    </div>
  </>
}
