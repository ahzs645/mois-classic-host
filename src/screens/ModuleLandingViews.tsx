import { useState } from 'react'
import { PBButton, PBCheckbox, PBDataWindow, PBInput, PBViewHeader, pbSlug } from '../pb'
import { dayRows, useSchedulerStore } from '../data/schedulerStore'
import { useProviderRoster } from '../data/user-account-session'
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

/* Scheduler ▸ Provider Schedules: Provider Work Load. Laid out from the
   2026-10-02 TRAINING capture (Desktop 11.42.54 PM, v02.31.23, ≈1.13× CSS
   px): a white Find row, the Date strip and the column captions on one pale
   blue (#d3e5f8), the captions in grey, two lines, Provider left and the
   figures right; three column groups split by a white rule in the band and a
   faint one down the rows; every provider on the roster in alphabetical
   order, 24 px rows zebra'd white / #e8e8e8, no current-row highlight, and an
   Open Daybook button at the right of each. A provider with nothing booked
   reads "-" in every count and "- : -" in both times; a booked one reads the
   count, the minutes booked and "11 : 00"-style first / last times. */
const WORKLOAD_CSS = `
.sch-workload { --pb-dw-row-h: 24px; --pb-dw-header: #d3e5f8; --pb-dw-pad-x: 6px; }
.sch-workload .pb-dw__table > thead > tr > th {
  height: 39px; color: #808080; vertical-align: top; padding-top: 3px; line-height: 15px;
  border-right: 0; border-top: 0; border-bottom: 0;
}
.sch-workload .pb-dw__table > thead > tr > th:nth-child(1) { padding-left: 12px; }
.sch-workload .pb-dw__table > tbody > tr > td:nth-child(1) { padding-left: 12px; }
.sch-workload .pb-dw__table > thead > tr > th:is(:nth-child(2), :nth-child(4), :nth-child(7)) { border-left: 2px solid #f4f8fd; }
.sch-workload .pb-dw__table > tbody > tr > td:is(:nth-child(2), :nth-child(4), :nth-child(7)) { border-left: 2px solid #ececec; }
.sch-workload .pb-dw__table > tbody > tr > td:nth-child(7) { padding-right: 12px; }
.sch-workload .pb-dw__table > thead > tr > th:nth-child(3) { padding: 3px 2px 0; text-overflow: clip; }
/* the capture's first row is white: the zebra starts on the second */
.sch-workload .pb-dw__table > tbody > tr:nth-child(odd) { background: var(--pb-dw-row); }
.sch-workload .pb-dw__table > tbody > tr:nth-child(even) { background: var(--pb-dw-row-alt); }
`

const WL_DATE = new Intl.DateTimeFormat('en-CA', { weekday: 'long', month: 'long', day: '2-digit', year: 'numeric' })
const wlTime = (hr?: string, mn?: string) => (hr ? `${hr} : ${mn}` : '- : -')

export function ProviderWorkloadView({ offset, onMove, onOpen }: {
  offset: number; onMove: (move: 'prev-day' | 'next-day') => void; onOpen: (provider: string) => void;
}) {
  const [find, setFind] = useState('')
  const [hideEmpty, setHideEmpty] = useState(false)
  const sched = useSchedulerStore()
  const roster = useProviderRoster()
  const rows = [...new Set(roster.map((p) => p.provider))]
    .sort((a, b) => a.localeCompare(b))
    .map((provider) => {
      /* every provider's own day (data/daybook.ts, data/schedulerStore.ts),
         in booking order; a booking's # counts five-minute slots */
      const day = dayRows(sched, provider, offset).slice().sort((a, b) => `${a.hr}${a.mn}`.localeCompare(`${b.hr}${b.mn}`))
      const minutes = day.reduce((n, r) => n + (Number(r.n) || 0) * 5, 0)
      return {
        provider,
        appointments: day.length ? String(day.length) : '-',
        group: '-',
        total: minutes ? String(minutes) : '-',
        first: wlTime(day[0]?.hr, day[0]?.mn),
        last: wlTime(day.at(-1)?.hr, day.at(-1)?.mn),
        count: day.length,
      }
    })
    .filter((row) => row.provider.toLowerCase().includes(find.toLowerCase()) && (!hideEmpty || row.count > 0))
  /* PowerBuilder prints the weekday with no comma after it */
  const stamp = WL_DATE.format(daybookDate(offset)).replace(', ', ' ')
  return <><PBViewHeader title="Provider Work Load" />
    <style>{WORKLOAD_CSS}</style>
    <div className="pb-row" style={{ height: 24, padding: '0 10px', background: 'white', gap: 10, flex: 'none' }}>
      <span style={{ width: 28 }}>Find:</span><PBInput w={232} value={find} onChange={(event) => setFind(event.target.value)} aria-label="Find provider" data-tutorial-id="host.mois.field.workload-find" />
      <PBCheckbox label="Hide Providers with No Appointments" checked={hideEmpty} onChange={setHideEmpty} />
    </div>
    <div className="pb-row" style={{ height: 27, padding: '0 10px', background: '#d3e5f8', gap: 2, flex: 'none' }}>
      <span style={{ width: 47 }}>Date:</span>
      <PBButton size="sm" style={{ width: 21 }} onClick={() => onMove('prev-day')} command="workload-prev-day">&lt;</PBButton>
      <PBInput w={74} align="center" value={daybookStamp(offset)} readOnly style={{ background: '#fff' }} />
      <PBButton size="sm" style={{ width: 21 }} onClick={() => onMove('next-day')} command="workload-next-day">&gt;</PBButton>
      <b style={{ marginLeft: 12 }}>{stamp}</b>
    </div>
    <div className="sch-workload" style={{ display: 'flex', flex: 1, minHeight: 0, background: 'white' }}>
      <PBDataWindow gutter={false} rules={false} stretch current={-1} rows={rows}
        rowTutorialId={(row) => `host.mois.row.workload-${pbSlug(row.provider)}`}
        columns={[
          { key: 'provider', header: 'Provider', width: 287, headAlign: 'left' },
          { key: 'appointments', header: <>Number of<br />Appoints</>, width: 63, align: 'right', headAlign: 'right' },
          { key: 'group', header: <>Number of<br />Group Appts</>, width: 70, align: 'right', headAlign: 'right' },
          { key: 'total', header: <>Total Time<br />(minutes)</>, width: 68, align: 'right', headAlign: 'right' },
          { key: 'first', header: <>First<br />Appt.</>, width: 44, align: 'center', headAlign: 'center' },
          { key: 'last', header: <>Last<br />Appt.</>, width: 46, align: 'center', headAlign: 'center' },
          { key: 'open', header: '', align: 'right', render: (row) => (
            <PBButton size="sm" style={{ width: 78 }} onClick={() => onOpen(row.provider)} command={`open-daybook-${pbSlug(row.provider)}`}>Open Daybook</PBButton>
          ) },
        ]} />
    </div>
  </>
}
