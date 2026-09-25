import { useState } from 'react'
import { PBButton, PBDropDownDataWindow, PBInput, PBLookup, PBSelect, PBWindow, type PBMenuItem } from '../../pb'
import { APPOINTMENT_STATUSES, VISIT_CODE_FILL } from '../../data/daybook'
import { daybookProviders } from '../../data/mois'
import { currentRow, schedulerStore, stampOf, useSchedulerStore } from '../../data/schedulerStore'
import { registerAreaWindow, type AreaWindowProps } from '../areaWindowRegistry'
import { ContextMenu } from './DaybookMenus'
import { NAVY } from './SchedulerDialog'

/* ============================================================================
   Appointment Detail, and the right-click menu of an appointment in a Day or
   Week view.

   Menu — art. 3075361 `b45a7ee6…`: Create Appointment (grey on a booking),
   Edit Appointment, Delete Appointment, Copy / Move Appointment | Quick
   Registration | Open Chart, Open Encounter | Create Task, Create Message,
   Create Reminder | Print Label | Change Width.

   Appointment Detail — art. 3075361 `4ed73447…`: an `Appointment Detail` box
   with Patient Information (Chart No. and its "…", First Name, Last Name),
   Booking Information (Provider, Resource, Date / Time, Time Slots, Visit
   Code, Visit Mode, Visit Reason, Service Loc.) and Appointment Status
   (Status, Room, and down the right Arrived / In-Room / Seen / Discharge,
   each with the button — or Ctrl+T — that stamps the current date and
   time); "F2 = Save and Close" beside Save / Close and Cancel. "This
   information will fill on the Encounter window."
   ========================================================================= */

function DayViewApptMenu({ args, close, open }: AreaWindowProps) {
  useSchedulerStore()
  const row = currentRow()
  const go = (id: string) => () => { if (!open(id)) close() }
  const items: PBMenuItem[] = [
    { label: 'Create Appointment', disabled: true },
    { label: 'Edit Appointment', onSelect: go('appointment-detail') },
    { label: 'Delete Appointment', onSelect: go('delete-appointment') },
    { label: 'Copy / Move Appointment', onSelect: go('copy-move-appointment') },
    { sep: true },
    { label: 'Quick Registration', disabled: !!row?.chart, onSelect: go('quick-registration') },
    { sep: true },
    { label: 'Open Chart', disabled: !row?.chart },
    { label: 'Open Encounter', disabled: !row?.chart },
    { sep: true },
    { label: 'Create Task', onSelect: go('create-task') },
    { label: 'Create Message', onSelect: go('create-message') },
    { label: 'Create Reminder', onSelect: go('create-recall') },
    { sep: true },
    { label: 'Print Label' },
    { sep: true },
    { label: 'Change Width' },
  ]
  return <ContextMenu menu="appt" items={items} args={args} close={close} />
}

const now = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')} : ${String(d.getMinutes()).padStart(2, '0')}`
}

const STAMPS = ['Arrived:', 'In-Room:', 'Seen:', 'Discharge:'] as const
const STAMP_STATUS: Record<string, string> = { 'Arrived:': 'A', 'In-Room:': 'I', 'Seen:': 'S', 'Discharge:': 'D' }

function AppointmentDetail({ close }: AreaWindowProps) {
  const s = useSchedulerStore()
  const [row] = useState(() => currentRow(s))
  const where = s.current
  const [status, setStatus] = useState(row?.as ?? '')
  const [times, setTimes] = useState<Record<string, string>>({})
  const stamp = (label: string) => {
    setTimes((t) => ({ ...t, [label]: now() }))
    setStatus(STAMP_STATUS[label] ?? status)
  }
  const save = () => {
    if (row && where && status) schedulerStore.setStatusByKey(row.key, status)
    schedulerStore.done('timestamps-saved')
    close()
  }
  return (
    <div className="pb-modal-layer pb-modal-layer--plain" style={{ zIndex: 85 }}>
      <PBWindow
        child
        controls={false}
        title="Appointment Detail"
        tutorialId="host.mois.dialog.appointment-detail"
        onClose={close}
        style={{ width: 560, height: 560, maxWidth: '100%', maxHeight: '100%' }}
      >
        <div style={{ flex: '1 1 auto', minHeight: 0, padding: 10, background: 'var(--pb-face)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ border: '1px solid #646464', flex: '1 1 auto' }}>
            <div className="pb-band">Appointment Detail</div>
            <div style={{ padding: '4px 10px', borderBottom: '1px solid #bdbdbd' }}>
              <div style={{ ...NAVY, marginBottom: 4 }}>Patient Information</div>
              <div className="pb-row" style={{ gap: 6 }}><span style={{ width: 70 }}>Chart No.:</span><PBLookup w={110} value={row?.chart ?? ''} /></div>
              <div className="pb-row" style={{ gap: 6, marginTop: 4 }}>
                <span style={{ width: 70 }}>First Name:</span><PBInput w={150} value={row?.first ?? ''} readOnly />
                <span style={{ marginLeft: 16 }}>Last Name:</span><PBInput w={150} value={row?.last ?? ''} readOnly />
              </div>
            </div>
            <div style={{ padding: '4px 10px', borderBottom: '1px solid #bdbdbd' }}>
              <div style={{ ...NAVY, marginBottom: 4 }}>Booking Information</div>
              <div className="pb-row" style={{ gap: 6 }}>
                <span style={{ width: 70 }}>Provider:</span><PBSelect w={150} options={daybookProviders.map((p) => p.provider)} value={where?.provider ?? ''} onChange={() => {}} />
                <span style={{ marginLeft: 16, width: 70 }}>Resource:</span><PBSelect w={140} options={['']} />
              </div>
              <div className="pb-row" style={{ gap: 6, marginTop: 4 }}>
                <span style={{ width: 70 }}>Date / Time:</span><PBInput w={80} value={where ? stampOf(where.offset) : ''} readOnly /><PBInput w={60} align="center" value={row ? `${row.hr} : ${row.mn}` : ''} readOnly />
                <span style={{ marginLeft: 16, width: 70 }}>Time Slots:</span><PBInput w={40} value={row?.n ?? ''} readOnly />
              </div>
              <div className="pb-row" style={{ gap: 6, marginTop: 4 }}>
                <span style={{ width: 70 }}>Visit Code:</span><PBSelect w={60} options={Object.keys(VISIT_CODE_FILL)} value={row?.code ?? ''} onChange={() => {}} />
                <span style={{ marginLeft: 106, width: 70 }}>Visit Mode:</span><PBSelect w={80} options={['DE', 'TE', 'VI']} />
              </div>
              <div className="pb-row" style={{ gap: 6, marginTop: 4 }}><span style={{ width: 70 }}>Visit Reason:</span><PBLookup w={340} value={row?.reason ?? ''} /></div>
              <div className="pb-row" style={{ gap: 6, marginTop: 4 }}><span style={{ width: 70 }}>Service Loc.:</span><PBSelect w={320} options={[row?.loc ?? '']} /></div>
            </div>
            <div style={{ padding: '4px 10px', display: 'flex', gap: 20 }}>
              <div style={{ flex: '1 1 auto' }}>
                <div style={{ ...NAVY, marginBottom: 4 }}>Appointment Status</div>
                <div className="pb-row" style={{ gap: 6 }}>
                  <span style={{ width: 70 }}>Status:</span>
                  <PBDropDownDataWindow
                    w={62}
                    value={status}
                    display="code"
                    columns={[{ key: 'code', header: 'Code', width: 46 }, { key: 'label', header: 'Description', width: 140 }]}
                    rows={APPOINTMENT_STATUSES}
                    onSelect={(r) => setStatus(String(r.code))}
                  />
                </div>
                <div className="pb-row" style={{ gap: 6, marginTop: 4 }}><span style={{ width: 70 }}>Room:</span><PBInput w={150} defaultValue={row?.room ?? ''} /></div>
              </div>
              <div style={{ display: 'grid', gap: 4, alignContent: 'start', paddingTop: 18 }} data-tutorial-id="host.mois.field.appt-timestamps">
                {STAMPS.map((label) => (
                  <div key={label} className="pb-row" style={{ gap: 4 }}>
                    <span style={{ width: 64, textAlign: 'right' }}>{label}</span>
                    <PBInput w={62} align="center" value={times[label] ?? ' : '} readOnly />
                    <PBButton
                      size="sm"
                      title="Ctrl+T"
                      style={{ minWidth: 22 }}
                      data-tutorial-id={`host.mois.command.stamp-${label.toLowerCase().replace(/[^a-z]/g, '')}`}
                      onClick={() => stamp(label)}
                    >
                      ⌚
                    </PBButton>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="pb-row" style={{ padding: '10px 0 2px', gap: 10 }}>
            <span style={{ width: 150 }}>F2 = Save and Close</span>
            <PBButton style={{ minWidth: 100 }} data-tutorial-id="host.mois.command.save-close" onClick={save}>Save / Close</PBButton>
            <PBButton style={{ minWidth: 100 }} onClick={close}>Cancel</PBButton>
          </div>
        </div>
      </PBWindow>
    </div>
  )
}

registerAreaWindow('dayview-appt-menu', DayViewApptMenu)
registerAreaWindow('appointment-detail', AppointmentDetail)
