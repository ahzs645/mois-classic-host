import { useState } from 'react'
import { PBButton, PBCheckbox, PBDataWindow, PBInput, PBViewHeader } from '../pb'
import { daybookProviders } from '../data/mois'
import { daybookAppointments } from '../data/daybook'
import { daybookDate, daybookStamp } from './SchedulerView'

/** Live TRAINING landing pages, inspected 2026-09-21. */
export function UserManagementLanding() {
  return <><PBViewHeader title="User Management" />
    <div style={{ background: 'var(--pb-dw-header)', padding: '8px 10px', fontWeight: 700 }}>User / Access Management</div>
    <div style={{ height: 32, background: 'white', borderBottom: '1px solid #666' }} />
    <div style={{ background: 'white', flex: 1, padding: '8px 18px' }}>
      <p>These pages are used to manage:</p>
      <dl style={{ display: 'grid', gridTemplateColumns: '116px 1fr', gap: '26px 0', padding: '0 18px' }}>
        <dt><b>Security Profiles:</b></dt><dd style={{ margin: 0 }}>Create and manage user security profiles. Security profiles are used to logically group users for security and access reasons.</dd>
        <dt><b>User Accounts:</b></dt><dd style={{ margin: 0 }}>Create user accounts and manage individual user's security matrix</dd>
        <dt><b>User Groups:</b></dt><dd style={{ margin: 0 }}>Create and manage User Groups. User Groups are used as a distribution list for things like tasks and messages.</dd>
      </dl>
    </div>
  </>
}

export function ProviderWorkloadView({ offset, onMove, onOpen }: {
  offset: number; onMove: (move: 'prev-day' | 'next-day') => void; onOpen: (provider: string) => void;
}) {
  const [find, setFind] = useState('')
  const [hideEmpty, setHideEmpty] = useState(false)
  // Only the existing Technical Support fixture establishes appointment counts.
  const rows = daybookProviders.map(({ provider }) => ({ provider,
    appointments: provider === 'TECHNICAL SUPPORT' && offset === 0 ? daybookAppointments.length : 0,
  })).filter((row) => row.provider.toLowerCase().includes(find.toLowerCase()) && (!hideEmpty || row.appointments > 0))
  return <><PBViewHeader title="Provider Work Load" />
    <div className="pb-row" style={{ padding: '4px 10px', background: 'white' }}>
      <span>Find:</span><PBInput w={230} value={find} onChange={(event) => setFind(event.target.value)} aria-label="Find provider" />
      <PBCheckbox label="Hide Providers with No Appointments" checked={hideEmpty} onChange={setHideEmpty} />
    </div>
    <div className="pb-row" style={{ padding: '3px 10px', background: '#d3e5f7' }}>
      <span>Date:</span><PBButton size="sm" onClick={() => onMove('prev-day')}>‹</PBButton>
      <PBInput w={92} value={daybookStamp(offset)} readOnly /><PBButton size="sm" onClick={() => onMove('next-day')}>›</PBButton>
      <b>{daybookDate(offset).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</b>
    </div>
    <div style={{ display: 'flex', flex: 1, minHeight: 0, background: 'white' }}>
      <PBDataWindow gutter={false} rules={false} rows={rows} columns={[
        { key: 'provider', header: 'Provider', width: 284 },
        { key: 'appointments', header: <>Number of<br />Appoints</>, width: 68, render: (row) => row.appointments || '-' },
        { key: 'group', header: <>Number of<br />Group Appts</>, width: 68 },
        { key: 'total', header: <>Total Time<br />(minutes)</>, width: 66 },
        { key: 'first', header: <>First<br />Appt.</>, width: 46 },
        { key: 'last', header: <>Last<br />Appt.</>, width: 46 },
        { key: 'open', header: '', align: 'right', render: (row) => <PBButton size="sm" onClick={() => onOpen(row.provider)}>Open Daybook</PBButton> },
      ]} />
    </div>
  </>
}
