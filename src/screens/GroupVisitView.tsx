import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { RESOURCES } from '../data/daybook'
import { daybookProviders, groupVisitRows } from '../data/mois'
import { usePatientRoster } from '../data/patient-context'
import { schedulerStore } from '../data/schedulerStore'
import { DESKTOP_PROVIDER_DEFAULT } from '../data/session'
import { groupKeyOf, schedulerExtras, useSchedulerExtras, type GroupVisitRow } from '../data/schedulerExtras'
import { useScreenReport } from '../host/screen-state'
import {
  PBBand, PBCheckbox, PBCommandRow, PBDataWindow, PBDropField, PBInput,
  PBSelect, PBTabs, PBTextArea, PBViewHeader, pbSlug, type PBColumn,
} from '../pb'
import { AdvancedLookupDialog } from './AdvancedLookupDialog'
import { useOpenWindow } from './areaWindowRegistry'
import { GRID_BOX, PickButtons, PickListWindow, SIZE } from './lookupKit'
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

/* Widths and row pitch are the DEV v02.31.23 list's, read off the header in
   `scheduler-group-bookings-patient-list.png` (Aug 2026, 100 %): a 16 px
   gutter, then 76 / 28 / 29 / 23 / 140 / 80 / 16 / 212 / 40 / 132, rows 18 px
   apart. Every column is sized, so the band stops at Service Location the
   way the capture's does. */
const columns: PBColumn<Visit>[] = [
  { key: 'date', header: 'Date', width: 76, align: 'center' },
  { key: 'hr', header: 'HR', width: 28, align: 'center' },
  { key: 'min', header: 'MIN', width: 29, align: 'center' },
  { key: 'n', header: '#', width: 23, align: 'center' },
  { key: 'provider', header: 'Provider', width: 140 },
  { key: 'topic', header: 'Topic Code', width: 80, align: 'center' },
  { key: 'd', header: '', width: 16, dots: true },
  { key: 'desc', header: 'Topic Description', width: 212 },
  { key: 'code', header: 'Code', width: 40, align: 'center' },
  { key: 'loc', header: 'Service Location', width: 132 },
]
const GRID_VARS = { ['--pb-dw-row-h' as string]: '18px', ['--pb-dw-gutter-width' as string]: '15px' } as CSSProperties

/** where a column starts, from the grid's left edge (3 px pad + gutter) */
const leftOf = (key: string) => 3 + 16 + columns.slice(0, columns.findIndex((c) => c.key === key)).reduce((a, c) => a + Number(c.width), 0)

/* The filter boxes ride over their columns — a drop-down over Provider, then
   Topic Code, Topic Description and Service Location (DEV capture: 132 / 78 /
   209 / 125 px; v02.30.11 `21c6140d…` has the same four). */
const FILTERS = [
  { key: 'provider', w: 136, drop: true },
  { key: 'topic', w: 78 },
  { key: 'desc', w: 209 },
  { key: 'loc', w: 125 },
] as const

/* PowerBuilder parks a recurrence glyph in the gutter of a series row: a
   black ring with an arrowhead on either side (DEV capture, rows 2025.10.30
   and 2025.10.16). */
const SeriesGlyph = () => (
  <svg width="12" height="11" viewBox="0 0 12 11" aria-label="series">
    <circle cx="6" cy="5.5" r="3.6" fill="none" stroke="#000" strokeWidth="1.4" />
    <path d="M0.6 6.2 L2.4 3.9 L4 6.2 Z" fill="#000" />
    <path d="M8 4.8 L9.6 7.1 L11.4 4.8 Z" fill="#000" />
  </svg>
)

/* The four tabs are PowerBuilder's fixed-width ones, 134 px each and packed
   left — not stretched across the strip — in both the DEV capture and
   v02.30.11 `21c6140d…` (168 px at 125 %): PBTabs' `tabWidth`. The page
   under them is a framed panel inset 6 px. */
const TAB_WIDTH = 134
const TAB_CSS = `
.pb-gv-tabs .pb-tabs, .pb-gv-tabs .pb-tabs__page { min-width: 0; }
.pb-gv-frame { flex: 1 1 auto; min-height: 0; min-width: 0; overflow: hidden; display: flex; flex-direction: column; margin: 6px 6px 0; border: 1px solid #a0a0a0; border-bottom: 0; background: var(--pb-face); }
`

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
    setDrafts([{ date: '2026.08.18', hr: '13', min: '00', n: '12', provider: DESKTOP_PROVIDER_DEFAULT, topic: '', desc: '', code: 'G', loc: 'PRINCE GEORGE CLINIC', series: false }, ...drafts])
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

      <div style={{ position: 'relative', height: 23, flex: 'none' }}>
        {FILTERS.map((f) => (
          <span key={f.key} style={{ position: 'absolute', top: 3, left: leftOf(f.key) + 2 }}>
            {'drop' in f ? <PBDropField w={f.w} /> : <PBInput w={f.w} />}
          </span>
        ))}
      </div>

      <div className="pb-row" style={{ padding: '0 8px 4px', gap: 28 }}>
        <PBCheckbox label="Hide Future Appointment Series" checked={hideSeries} onChange={setHideSeries} tutorialId="host.mois.check.hide-future-series" />
        <PBCheckbox label="Hide Future Appointments All" checked={hideFuture} onChange={setHideFuture} tutorialId="host.mois.check.hide-future-all" />
      </div>

      <div style={{ height: 249, display: 'flex', padding: '0 3px', ...GRID_VARS }}>
        <PBDataWindow
          columns={columns}
          rows={rows}
          current={cur}
          onCurrentChange={setCur}
          rowIcon={(r) => (r.series ? <SeriesGlyph /> : null)}
          rowTutorialId={(r) => `host.mois.row.group-${r.date.replace(/\./g, '')}-${r.hr}${r.min}-${pbSlug(r.provider).slice(0, 12)}`}
        />
      </div>

      <style href="mois-classic/group-visit-tabs" precedence="medium">{TAB_CSS}</style>
      <div className="pb-gv-tabs" style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '4px 3px 3px' }}>
        <PBTabs
          tabs={['Patient List', 'Other Provider(s)', 'Other Resource(s)', 'Additional Information']}
          active={tab}
          onChange={setTab}
          tabWidth={TAB_WIDTH}
        >
          <div className="pb-gv-frame">
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
            <DialogButton id="group-list-new" width={51} onClick={onNew}>New</DialogButton>
            <DialogButton id="group-list-delete" width={51} onClick={onDelete}>Delete</DialogButton>
          </>}>
            {tab === 'Patient List' ? 'Patient List'
              : tab === 'Other Provider(s)' ? 'Other Provider List' : 'Other Resource List'}
          </PBBand>
          <div style={{ flex: '1 1 auto', minHeight: 0, minWidth: 0, display: 'flex', background: 'var(--pb-window)' }} data-tutorial-id="host.mois.field.group-list">
            {tab === 'Patient List' ? (
              /* DEV `scheduler-group-bookings-patient-list.png`: a gutter, "…"
                 lookups after Chart, Visit Reason, Health Issue and Services,
                 and TM / RP / the clip past BS (matrix rows 1335-1347) — the
                 grid is wider than the frame and pans */
              <PBDataWindow
                flush
                hscroll
                rows={lists.patients}
                current={patCur}
                onCurrentChange={setPatCur}
                rowClassName={(p) => (['C', 'R', 'N'].includes(p.as) ? 'pb-dw--struck' : undefined)}
                rowTutorialId={(p) => `host.mois.row.group-patient-${p.chart}`}
                style={GRID_VARS}
                columns={[
                  { key: 'chart', header: 'Chart', width: 57, align: 'center' },
                  { key: 'd1', header: '', width: 15, dots: true },
                  { key: 'first', header: 'First Name', width: 80 },
                  { key: 'last', header: 'Last Name', width: 103 },
                  { key: 'code', header: 'Code', width: 40, align: 'center' },
                  { key: 'mode', header: 'Mode', width: 46, align: 'center' },
                  { key: 'reason', header: 'Visit Reason', width: 168 },
                  { key: 'd2', header: '', width: 16, dots: true },
                  { key: 'issue', header: 'Health Issue', width: 72 },
                  { key: 'd3', header: '', width: 15, dots: true },
                  { key: 'services', header: 'Services', width: 64 },
                  { key: 'd4', header: '', width: 14, dots: true },
                  { key: 'as', header: 'AS', width: 37, align: 'center' },
                  { key: 'ds', header: 'DS', width: 22, align: 'center' },
                  { key: 'bs', header: 'BS', width: 23, align: 'center' },
                  { key: 't', header: 'TM', width: 23, align: 'center' },
                  { key: 'rp', header: 'RP', width: 23, align: 'center', render: () => '-' },
                  { key: 'clip', header: '\u{1F4CE}', width: 18, align: 'center', render: () => '-' },
                ]}
                /* an empty list is a bare grid, no message (DEV capture) */
                empty={false}
              />
            ) : (
              /* DEV `scheduler-group-bookings-providers.png` / `-resources.png`
                 and v02.30.11 `21c6140d…`: a gutter, then Provider (Resource)
                 210, "…" 16, Note 362, Reserve Time on Schedule 166 */
              <PBDataWindow
                flush
                rows={others.map((o, i) => ({ ...o, i }))}
                style={GRID_VARS}
                current={otherCur}
                onCurrentChange={setOtherCur}
                /* a red square beside a provider says the row needs saving (303808) */
                rowIcon={(r) => (!r.reserved && tab === 'Other Provider(s)' ? <span style={{ display: 'inline-block', width: 7, height: 7, background: '#d00000' }} /> : null)}
                columns={[
                  { key: 'name', header: tab === 'Other Provider(s)' ? 'Provider' : 'Resource', width: 210, headAlign: 'center' },
                  { key: 'd', header: '', width: 16, dots: true },
                  { key: 'note', header: 'Note', width: 362, headAlign: 'center' },
                  {
                    key: 'reserve', header: 'Reserve Time on Schedule', width: 166, align: 'center',
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
                empty={false}
              />
            )}
          </div>
          </>
          )}
          </div>
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
    <PickListWindow
      frame={(content, footer) => (
        <WorkspaceDialogFrame id={`group-${kind}-list`} title="MOIS - Search Window" width={480} height={320} onClose={onClose} controls={false} zIndex={90}>
          {content}
          {footer}
        </WorkspaceDialogFrame>
      )}
      gridBox={{ ...GRID_BOX, margin: 8 }}
      grid={{
        rows,
        current: cur,
        onCurrentChange: setCur,
        onActivate: (r) => onPick(r.name),
        rowTutorialId: (r) => `host.mois.row.group-${kind}-${pbSlug(r.name.split(',')[0]!)}`,
        columns: [{ key: 'name', header: 'Name', width: 240 }, { key: 'detail', header: kind === 'provider' ? 'Type' : '' }],
      }}
      footer={(
        <PickButtons className="pb-row" style={{ gap: 8, padding: '0 0 10px', justifyContent: 'center', flex: 'none' }} size={SIZE.dialog(75)}
          buttons={[
            { label: 'Ok', command: `group-${kind}-ok`, onClick: () => { const r = rows[cur]; if (r) onPick(r.name) }, isDefault: true },
            { label: 'Cancel', command: `group-${kind}-cancel`, onClick: onClose },
          ]} />
      )}
    />
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
      {/* DEV `scheduler-group-bookings-info.png`: labels 11 px in, fields
          at 100 px — Resource a 104 px drop-down, Room Number 64 px, Comment
          a 115 px box running to 11 px short of the frame — and the Record
          Created / Last Modified line sits at the foot of the frame */}
      <div className="pb-form" style={{ gridTemplateColumns: '89px 1fr', alignItems: 'start', padding: '6px 11px 0' }}>
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Resource:</span>
        <PBSelect options={['', 'ROOM 1', 'ROOM 2', 'GROUP ROOM']} w={104} value={resource} onChange={(e) => onChange({ resource: e.target.value })} />
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Room Number:</span>
        <PBInput w={64} value={room} onChange={(e) => onChange({ room: e.target.value })} />
        <span className="pb-form__label" style={{ lineHeight: '19px' }}>Comment:</span>
        <PBTextArea w="100%" value={comment} onChange={(e) => onChange({ comment: e.target.value })} style={{ height: 115 }} data-tutorial-id="host.mois.field.group-comment" />
      </div>
      <div className="pb-row" style={{ padding: '2px 11px 8px', gap: 0, marginTop: 'auto' }}>
        <span style={{ width: 413 }}>Record Created:</span>
        <span>Last Modified:</span>
      </div>
    </>
  )
}
