import { useEffect, useMemo, useState } from 'react'
import { RESOURCES } from '../data/daybook'
import { daybookProviders, groupVisitRows } from '../data/mois'
import { usePatientRoster } from '../data/patient-context'
import { schedulerStore } from '../data/schedulerStore'
import { groupKeyOf, schedulerExtras, useSchedulerExtras, type GroupVisitRow } from '../data/schedulerExtras'
import { useScreenReport } from '../host/screen-state'
import {
  PBBand, PBCheckbox, PBCommandRow, PBDataWindow, PBDropField, PBInput,
  PBSelect, PBTabs, PBTextArea, PBViewHeader, pbSlug, type PBColumn,
} from '../pb'
import { AdvancedLookupDialog } from './AdvancedLookupDialog'
import { useOpenWindow } from './areaWindowRegistry'
import { groupListsFor, updateGroup } from './scheduler/GroupBookingWindows'
import { DialogButton, WorkspaceDialogFrame } from './WorkspaceDialogFrame'

type Visit = GroupVisitRow

/* Group Visit List — art. 303840 `21c6140d…` (v02.30.11): the visit list
   (Date, HR, MIN, #, Provider, Topic Code, Topic Description, Code, Service
   Location) and the four tabs, where Other Provider(s) carries a `Reserve
   Time on Schedule` link per provider. Adding a provider turns the link on;
   following it blocks the meeting out of that provider's day (it files a
   GROUP VISIT reservation block — Reservation Blocks ▸ Provider).

   The command row is the v02.3x one (art. 303808 `fd614f7b…` and
   `6726c142…`): New Appt, Appt Series, Save, Delete Appt, Undo, Refresh,
   Prepare for Meeting, Create MSP Claims, Clone Appt. What each opens lives in
   scheduler/GroupBookingWindows.tsx (Prepare for Meeting, Group Visit - Bill
   MSP, Clone Group Booking) and scheduler/AppointmentSeriesWindows.tsx (Appt
   Series, on its Group Visit type). The Patient List's New adds a patient
   through the Advanced Lookup Service; Other Provider(s) / Other Resource(s)
   New add from the day books' providers and Resource Schedules' resources
   (INFERRED: those two pickers are not captured). A visit's lists live in
   data/schedulerExtras so the windows see the same patients the tabs do.
   "Hide Future Appointment Series" / "Hide Future Appointments All" drop the
   series rows / every row dated after today. */

const columns: PBColumn<Visit>[] = [
  { key: 'date', header: 'Date', width: 78, align: 'center' },
  { key: 'hr', header: 'HR', width: 28, align: 'center' },
  { key: 'min', header: 'MIN', width: 32, align: 'center' },
  { key: 'n', header: '#', width: 26, align: 'center' },
  { key: 'provider', header: 'Provider', width: 150 },
  { key: 'topic', header: 'Topic Code', width: 78, align: 'center' },
  { key: 'd', header: '', dots: true },
  { key: 'desc', header: 'Topic Description' },
  { key: 'code', header: 'Code', width: 44, align: 'center' },
  { key: 'loc', header: 'Service Location', width: 130 },
]

/* PowerBuilder parks a tiny recurrence glyph in the gutter of a series row. */
const SeriesGlyph = () => (
  <svg width="11" height="11" viewBox="0 0 11 11">
    <circle cx="5.5" cy="5.5" r="4" fill="none" stroke="#2f5a8c" />
    <path d="M5.5 3v3l2 1.2" stroke="#2f5a8c" fill="none" strokeWidth="1.1" />
  </svg>
)

const TODAY = '2026.08.11'

export function GroupVisitView() {
  const extras = useSchedulerExtras()
  const openWindow = useOpenWindow()
  const roster = usePatientRoster()
  const [tab, setTab] = useState('Patient List')
  const [drafts, setDrafts] = useState<Visit[]>([])
  const [cur, setCur] = useState(0)
  const [patCur, setPatCur] = useState(0)
  const [otherCur, setOtherCur] = useState(0)
  const [hideSeries, setHideSeries] = useState(false)
  const [hideFuture, setHideFuture] = useState(false)
  const [picker, setPicker] = useState<'' | 'patient' | 'provider' | 'resource'>('')
  const rows = useMemo(() => [
    ...drafts,
    ...extras.addedVisits,
    ...(groupVisitRows as Visit[]).filter((r) => r.date),
  ]
    .filter((r) => !extras.removedVisits.includes(groupKeyOf(r)))
    .filter((r) => !(hideSeries && r.series && r.date > TODAY))
    .filter((r) => !(hideFuture && r.date > TODAY)), [drafts, extras.addedVisits, extras.removedVisits, hideSeries, hideFuture])
  const visit = rows[Math.min(cur, Math.max(0, rows.length - 1))]
  const lists = groupListsFor(visit, extras.groups)
  const others = tab === 'Other Resource(s)' ? lists.resources : lists.providers

  /* the windows the command row opens act on the current visit */
  useEffect(() => { schedulerExtras.setCurrentVisit(visit ?? null) }, [visit])
  useScreenReport({ visit: visit ? `${visit.date.replace(/\./g, '')}-${visit.hr}${visit.min}` : '', patients: lists.patients.length })

  const newAppt = () => {
    setDrafts([{ date: '2026.08.18', hr: '13', min: '00', n: '12', provider: 'TECHNICAL SUPPORT', topic: '', desc: '', code: 'G', loc: 'PRINCE GEORGE CLINIC', series: false }, ...drafts])
    setCur(0)
  }
  const reserve = (i: number) => {
    if (!visit) return
    const list = lists.providers.map((o, j) => (j === i ? { ...o, reserved: true } : o))
    updateGroup(visit, { providers: list })
    const o = lists.providers[i]
    if (o) {
      schedulerStore.addBlock(o.name, false, {
        id: `gv${Date.now()}`, date: visit.date, hr: String(Number(visit.hr)), min: String(Number(visit.min)),
        n: visit.n, code: 'GROUP VISIT', note: visit.desc,
      })
    }
  }
  const onNew = () => {
    if (!visit) return
    setPicker(tab === 'Patient List' ? 'patient' : tab === 'Other Resource(s)' ? 'resource' : 'provider')
  }
  const onDelete = () => {
    if (!visit) return
    if (tab === 'Patient List') updateGroup(visit, { patients: lists.patients.filter((_, i) => i !== patCur) })
    else if (tab === 'Other Provider(s)') updateGroup(visit, { providers: lists.providers.filter((_, i) => i !== otherCur) })
    else if (tab === 'Other Resource(s)') updateGroup(visit, { resources: lists.resources.filter((_, i) => i !== otherCur) })
  }
  const addPatient = (chart: string) => {
    const p = roster.find((x) => x.chart === chart)
    if (p && visit && !lists.patients.some((x) => x.chart === chart)) {
      updateGroup(visit, {
        patients: [...lists.patients, {
          chart, first: p.first.toUpperCase(), last: p.last.toUpperCase(), code: visit.code || 'G', mode: 'DE',
          reason: visit.desc, issue: '', services: '', as: '', ds: 'I', bs: 'I', t: '-',
        }],
      })
    }
    setPicker('')
  }

  return (
    <>
      <PBViewHeader title="Group Visit List" />
      <PBCommandRow
        commands={[
          { label: 'New Appt', onClick: newAppt },
          { label: 'Appt Series', onClick: () => { openWindow('appointment-series', { kind: 'group' }) } },
          { label: 'Save' },
          { label: 'Delete Appt', disabled: !visit, onClick: () => { if (visit) { schedulerExtras.removeVisit(groupKeyOf(visit)); setCur(0) } } },
          { label: 'Undo' }, { label: 'Refresh' },
          { label: 'Prepare for Meeting', width: 116, disabled: !visit, onClick: () => { openWindow('prepare-for-meeting') } },
          { label: 'Create MSP Claims', width: 110, disabled: !visit, onClick: () => { openWindow('group-visit-bill-msp') } },
          { label: 'Clone Appt', disabled: !visit, onClick: () => { openWindow('clone-group-booking') } },
        ]}
      />

      <div className="pb-row" style={{ padding: '3px 6px', gap: 6 }}>
        <PBDropField w={296} />
        <PBInput w={230} />
        <PBInput w={172} />
      </div>

      <div className="pb-row" style={{ padding: '0 8px 4px', gap: 28 }}>
        <PBCheckbox label="Hide Future Appointment Series" checked={hideSeries} onChange={setHideSeries} tutorialId="host.mois.check.hide-future-series" />
        <PBCheckbox label="Hide Future Appointments All" checked={hideFuture} onChange={setHideFuture} tutorialId="host.mois.check.hide-future-all" />
      </div>

      <div style={{ height: 244, display: 'flex', padding: '0 3px' }}>
        <PBDataWindow
          columns={columns}
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          rowIcon={(r) => (r.series ? <SeriesGlyph /> : null)}
          rowTutorialId={(r) => `host.mois.row.group-${r.date.replace(/\./g, '')}-${r.hr}${r.min}-${pbSlug(r.provider).slice(0, 12)}`}
        />
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '4px 3px 3px' }}>
        <PBTabs
          tabs={['Patient List', 'Other Provider(s)', 'Other Resource(s)', 'Additional Information']}
          active={tab}
          onChange={setTab}
          justified
        >
          {tab === 'Additional Information' ? (
            <VisitDetailPage
              key={visit ? groupKeyOf(visit) : ''}
              comment={lists.comment}
              room={lists.room}
              resource={lists.resource}
              onChange={(patch) => { if (visit) updateGroup(visit, patch) }}
            />
          ) : (
          <>
          <PBBand right={<>
            <DialogButton id="group-list-new" width={60} onClick={onNew}>New</DialogButton>
            <DialogButton id="group-list-delete" width={60} onClick={onDelete}>Delete</DialogButton>
          </>}>
            {tab === 'Patient List' ? 'Patient List'
              : tab === 'Other Provider(s)' ? 'Other Provider List' : 'Other Resource List'}
          </PBBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex' }} data-tutorial-id="host.mois.field.group-list">
            {tab === 'Patient List' ? (
              <PBDataWindow
                flush
                gutter={false}
                rows={lists.patients}
                current={patCur}
                onCurrentChange={setPatCur}
                rowClassName={(p) => (['C', 'R', 'N'].includes(p.as) ? 'pb-dw--struck' : undefined)}
                rowTutorialId={(p) => `host.mois.row.group-patient-${p.chart}`}
                columns={[
                  { key: 'chart', header: 'Chart', width: 72, align: 'center' },
                  { key: 'first', header: 'First Name', width: 92 },
                  { key: 'last', header: 'Last Name', width: 92 },
                  { key: 'code', header: 'Code', width: 46, align: 'center' },
                  { key: 'mode', header: 'Mode', width: 46, align: 'center' },
                  { key: 'reason', header: 'Visit Reason', width: 176 },
                  { key: 'issue', header: 'Health Issue', width: 108 },
                  { key: 'services', header: 'Services', width: 92 },
                  { key: 'as', header: 'AS', width: 30, align: 'center' },
                  { key: 'ds', header: 'DS', width: 30, align: 'center' },
                  { key: 'bs', header: 'BS', width: 30, align: 'center' },
                  { key: 't', header: 'T', width: 24, align: 'center' },
                ]}
                empty="No patients booked into this group visit."
              />
            ) : (
              <PBDataWindow
                flush
                gutter={false}
                rows={others.map((o, i) => ({ ...o, i }))}
                current={otherCur}
                onCurrentChange={setOtherCur}
                /* a red square beside a provider says the row needs saving (303808) */
                rowIcon={(r) => (!r.reserved && tab === 'Other Provider(s)' ? <span style={{ display: 'inline-block', width: 7, height: 7, background: '#d00000' }} /> : null)}
                columns={[
                  { key: 'name', header: tab === 'Other Provider(s)' ? 'Provider' : 'Resource', width: 228, align: 'center' },
                  { key: 'd', header: '', dots: true },
                  { key: 'note', header: 'Note', align: 'center' },
                  {
                    key: 'reserve', header: 'Reserve Time on Schedule', width: 160, align: 'center',
                    render: (r) => (r.reserved
                      ? <span>Reserved</span>
                      : (
                        <button
                          className="pb-link"
                          data-tutorial-id="host.mois.command.reserve-time-on-schedule"
                          onClick={() => {
                            if (tab === 'Other Provider(s)') reserve(Number(r.i))
                            else if (visit) updateGroup(visit, { resources: lists.resources.map((o, j) => (j === Number(r.i) ? { ...o, reserved: true } : o)) })
                          }}
                        >
                          Reserve Time on Schedule
                        </button>
                      )),
                  },
                ]}
                empty={`No ${tab.replace(/\(s\)/, 's').toLowerCase()} attached to this visit.`}
              />
            )}
          </div>
          </>
          )}
        </PBTabs>
      </div>

      {picker === 'patient' && (
        <AdvancedLookupDialog chart="" roster={roster} onPick={addPatient} onClose={() => setPicker('')} zIndex={90} />
      )}
      {(picker === 'provider' || picker === 'resource') && (
        <OtherPicker
          kind={picker}
          onPick={(name) => {
            if (visit) {
              const entry = { name, note: '', reserved: false }
              if (picker === 'provider' && !lists.providers.some((p) => p.name === name)) updateGroup(visit, { providers: [...lists.providers, entry] })
              if (picker === 'resource' && !lists.resources.some((p) => p.name === name)) updateGroup(visit, { resources: [...lists.resources, entry] })
            }
            setPicker('')
          }}
          onClose={() => setPicker('')}
        />
      )}
    </>
  )
}

function OtherPicker({ kind, onPick, onClose }: { kind: 'provider' | 'resource'; onPick: (name: string) => void; onClose: () => void }) {
  const rows = kind === 'provider'
    ? daybookProviders.map((p) => ({ name: p.provider, detail: p.type }))
    : RESOURCES.map((r) => ({ name: r, detail: 'Resource' }))
  const [cur, setCur] = useState(0)
  return (
    <WorkspaceDialogFrame id={`group-${kind}-list`} title="MOIS - Search Window" width={480} height={320} onClose={onClose} controls={false} zIndex={90}>
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', margin: 8 }}>
        <PBDataWindow
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          onActivate={(r) => onPick(r.name)}
          rowTutorialId={(r) => `host.mois.row.group-${kind}-${pbSlug(r.name.split(',')[0]!)}`}
          columns={[{ key: 'name', header: 'Name', width: 240 }, { key: 'detail', header: kind === 'provider' ? 'Type' : '' }]}
        />
      </div>
      <div className="pb-row" style={{ gap: 8, padding: '0 0 10px', justifyContent: 'center', flex: 'none' }}>
        <DialogButton id={`group-${kind}-ok`} width={75} onClick={() => { const r = rows[cur]; if (r) onPick(r.name) }} isDefault>Ok</DialogButton>
        <DialogButton id={`group-${kind}-cancel`} width={75} onClick={onClose}>Cancel</DialogButton>
      </div>
    </WorkspaceDialogFrame>
  )
}

/* Additional Information is a plain detail form, not another list. */
function VisitDetailPage({ comment, room, resource, onChange }: {
  comment: string; room: string; resource: string
  onChange: (patch: { comment?: string; room?: string; resource?: string }) => void
}) {
  return (
    <>
      <PBBand>Visit Detail</PBBand>
      <div className="pb-form" style={{ gridTemplateColumns: '92px 1fr', alignItems: 'start', padding: '6px 10px' }}>
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Resource:</span>
        <PBSelect options={['', 'ROOM 1', 'ROOM 2', 'GROUP ROOM']} w={130} value={resource} onChange={(e) => onChange({ resource: e.target.value })} />
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Room Number:</span>
        <PBInput w={82} value={room} onChange={(e) => onChange({ room: e.target.value })} />
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Comment:</span>
        <PBTextArea rows={8} w="100%" value={comment} onChange={(e) => onChange({ comment: e.target.value })} data-tutorial-id="host.mois.field.group-comment" />
      </div>
      <div className="pb-row" style={{ padding: '2px 10px 4px', gap: 0 }}>
        <span>Record Created:</span>
        <span style={{ width: 60 }} />
        <span>Last Modified:</span>
      </div>
    </>
  )
}
