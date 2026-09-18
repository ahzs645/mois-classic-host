import { useState } from 'react'
import {
  PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBDropField, PBInput, PBRadio,
  PBSelect, PBSummaryBand, PBTextArea, PBViewHeader, type PBColumn, type PBCommand,
} from '../pb'

type Appt = Record<string, string>

const columns: PBColumn<Appt>[] = [
  { key: 'hr', header: 'HR', width: 30, align: 'center' },
  { key: 'mn', header: 'MN', width: 32, align: 'center' },
  { key: 'code', header: 'Code', width: 42, align: 'center' },
  { key: 'mode', header: 'Mode', width: 44, align: 'center' },
  { key: 'n', header: '#', width: 26, align: 'center' },
  { key: 'chart', header: 'Chart', width: 68, align: 'center' },
  { key: 'first', header: 'First Name', width: 92 },
  { key: 'last', header: 'Last Name', width: 96 },
  { key: 'reason', header: 'Visit Reason', width: 160 },
  { key: 'loc', header: 'Service Location', width: 156 },
  { key: 'resource', header: 'Resource', width: 88 },
  { key: 'room', header: 'Room', width: 60 },
  /* the scrolled capture (scheduler-provider-daybook-right) reveals seven
     more flag columns past Room */
  { key: 'as', header: 'AS', width: 30, align: 'center' },
  { key: 'tk', header: 'TK', width: 30, align: 'center' },
  { key: 'mg', header: 'MG', width: 32, align: 'center' },
  { key: 'issue', header: 'Health Issue', width: 92 },
  { key: 'services', header: 'Services', width: 78 },
  { key: 'payor', header: 'Payor', width: 56, align: 'center' },
  { key: 'ds', header: 'DS', width: 30, align: 'center' },
  { key: 'bs', header: 'BS', width: 30, align: 'center' },
  { key: 'tm', header: 'TM', width: 32, align: 'center' },
  { key: 'rp', header: 'RP', width: 30, align: 'center' },
]

const resourceColumns: PBColumn<Appt>[] = [
  ...columns.slice(0, 10),
  { key: 'provider', header: 'Provider', width: 120 },
  { key: 'room', header: 'Room', width: 60 },
]

const HOURS = ['8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00']

/* The provider and resource day books are the same window with a different
   filter block: the resource view drops the MSP/call-list panel, the extra
   print commands, the Discharged filter and the summary strip. */
export function SchedulerView({ mode = 'provider' }: { mode?: 'provider' | 'resource' }) {
  const [view, setView] = useState('Scheduler')
  const [hide, setHide] = useState({ noshow: true, rebooked: true, cancelled: true, discharged: false })
  const isResource = mode === 'resource'

  return (
    <>
      {isResource
        ? <PBViewHeader title="Day Book: Tuesday August 11, 2026" meta="Appointment(s): 0" />
        : <PBViewHeader title="Tuesday Aug 11, 2026" meta="Appointment(s): 0" />}
      <PBCommandRow
        commands={[
          { label: 'New Appt' }, { label: 'Appt Series' }, { label: 'Save', disabled: true },
          { label: 'Delete Appt', disabled: true }, { label: 'Undo', disabled: true }, { label: 'Refresh' },
          ...(isResource ? [] : [
            null,
            { label: 'Print List' }, { label: 'Print Encounter', width: 100 }, { label: 'MSP Bill' },
            { label: 'Pre-Slot Wizard', width: 100 },
          ] as PBCommand[]),
        ]}
      />

      {/* ---- filter form: three panels divided by hairlines ---- */}
      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid #c9c9c9', flex: 'none', minWidth: 940 }}>
        {/* date navigator */}
        <div style={{ padding: '5px 8px', flex: 'none', width: 196 }}>
          <div className="pb-row"><span style={{ width: 40 }}>Date:</span><PBInput w={112} align="center" defaultValue="2026.08.11" /></div>
          <div className="pb-row" style={{ marginTop: 6, gap: 3 }}>
            <PBButton size="sm" style={{ width: 24 }}>&laquo;</PBButton>
            <PBButton size="sm" style={{ width: 24 }}>&lsaquo;</PBButton>
            <PBButton style={{ flex: '1 1 auto', minWidth: 0 }}>Today</PBButton>
            <PBButton size="sm" style={{ width: 24 }}>&rsaquo;</PBButton>
            <PBButton size="sm" style={{ width: 24 }}>&raquo;</PBButton>
          </div>
        </div>

        <span className="pb-vrule" style={{ margin: 0 }} />

        {isResource ? (
          <div className="pb-form" style={{ gridTemplateColumns: 'auto 1fr', flex: '1 1 auto', minWidth: 0, alignItems: 'start' }}>
            <span className="pb-form__label pb-form__label--right" style={{ lineHeight: '19px' }}>Resource</span>
            <PBSelect options={['-1', 'ROOM 1', 'ROOM 2', 'GROUP ROOM']} w={240} />

            <span className="pb-form__label pb-form__label--right" style={{ lineHeight: '19px' }}>View Type:</span>
            <div className="pb-row pb-row--gap-lg">
              {['Scheduler', 'Provider', 'Biller'].map((v) => (
                <PBRadio key={v} name="viewtype" label={v} checked={view === v} onChange={() => setView(v)} />
              ))}
            </div>

            <span className="pb-form__label pb-form__label--right" style={{ lineHeight: '19px' }}>Hide Status:</span>
            <div className="pb-row pb-row--gap-lg">
              <PBCheckbox label="No-Show" checked={hide.noshow} onChange={(v) => setHide({ ...hide, noshow: v })} />
              <PBCheckbox label="Rebooked" checked={hide.rebooked} onChange={(v) => setHide({ ...hide, rebooked: v })} />
              <PBCheckbox label="Cancelled" checked={hide.cancelled} onChange={(v) => setHide({ ...hide, cancelled: v })} />
            </div>
          </div>
        ) : (
        <>
        {/* the main filter block — right-aligned labels, PB house style */}
        <div className="pb-form" style={{ gridTemplateColumns: 'auto 1fr', flex: '1 1 auto', minWidth: 0, alignItems: 'start' }}>
          <span className="pb-form__label pb-form__label--right" style={{ lineHeight: '19px' }}>Daybook For:</span>
          <div className="pb-row">
            <PBDropField w={244} defaultValue="TECHNICAL SUPPORT" />
            <button className="pb-link">Members</button>
          </div>

          <span className="pb-form__label pb-form__label--right" style={{ lineHeight: '14px' }}>Service<br />Location:</span>
          <div className="pb-row">
            <PBDropField w={244} />
            <PBCheckbox label="Show Only" />
          </div>

          <span className="pb-form__label pb-form__label--right" style={{ lineHeight: '19px' }}>View Type:</span>
          <div className="pb-row pb-row--gap-lg">
            {['Scheduler', 'Provider', 'Biller'].map((v) => (
              <PBRadio key={v} name="viewtype" label={v} checked={view === v} onChange={() => setView(v)} />
            ))}
          </div>

          <span className="pb-form__label pb-form__label--right" style={{ lineHeight: '19px' }}>Hide Status:</span>
          <div className="pb-row pb-row--gap-lg">
            <PBCheckbox label="No-Show" checked={hide.noshow} onChange={(v) => setHide({ ...hide, noshow: v })} />
            <PBCheckbox label="Rebooked" checked={hide.rebooked} onChange={(v) => setHide({ ...hide, rebooked: v })} />
            <PBCheckbox label="Cancelled" checked={hide.cancelled} onChange={(v) => setHide({ ...hide, cancelled: v })} />
          </div>

          <span />
          <PBCheckbox label="Discharged" checked={hide.discharged} onChange={(v) => setHide({ ...hide, discharged: v })} />

          <span className="pb-form__label pb-form__label--right" style={{ lineHeight: '19px' }}>or Show Only:</span>
          <div className="pb-row pb-row--gap-lg">
            <span className="pb-row">AS:<PBInput w={116} /></span>
            <span className="pb-row">DS:<PBInput w={116} /></span>
          </div>
        </div>

        <span className="pb-vrule" style={{ margin: 0 }} />

        {/* MSP / comment panel */}
        <div className="pb-form" style={{ gridTemplateColumns: 'auto 1fr', flex: 'none', width: 380, alignItems: 'start' }}>
          <span className="pb-form__label" style={{ lineHeight: '19px' }}>MSP Loc.:</span>
          <div className="pb-row"><PBInput w={78} /><span style={{ marginLeft: 12 }}>Alias:</span><PBDropField w={160} /></div>

          <span className="pb-form__label" style={{ lineHeight: '19px' }}>Comment:</span>
          <PBTextArea rows={3} w="100%" />

          <button className="pb-link" style={{ justifySelf: 'end' }}>see more</button>
          <button className="pb-link" style={{ justifySelf: 'start' }}>Create Call List</button>

          <span />
          <PBCheckbox label="Do Not Auto-Generate a Call List" />
        </div>
        </>
        )}
      </div>

      {/* ---- time ruler: hour cells with quarter-hour ticks along the foot ---- */}
      <div style={{ display: 'flex', height: 46, borderBottom: '1px solid #c9c9c9', background: '#fff', flex: 'none' }}>
        <div style={{ width: 18, borderRight: '1px solid #c9c9c9', fontSize: 10, textAlign: 'center' }}>00</div>
        {HOURS.map((h) => (
          <div
            key={h}
            style={{
              flex: '1 1 0',
              borderRight: '1px solid #c9c9c9',
              fontSize: 11,
              padding: '1px 0 0 4px',
              background: 'repeating-linear-gradient(90deg, #c9c9c9 0 1px, transparent 1px 25%)',
              backgroundSize: '100% 7px',
              backgroundPosition: 'left bottom',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {h}
          </div>
        ))}
      </div>

      {/* ---- PB's odd "< Scroll <" strip ---- */}
      <div className="pb-scrollrow">
        <PBButton size="sm" style={{ minWidth: 62 }}>&lsaquo; Scroll &lsaquo;</PBButton>
        <span className="pb-scrollrow__spacer" />
        <PBInput w={72} /><PBInput w={72} />
        <span className="pb-scrollrow__spacer" />
        <PBButton size="sm" style={{ minWidth: 62 }}>&rsaquo; Scroll &rsaquo;</PBButton>
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 3px 3px' }}>
        <PBDataWindow
          columns={isResource ? resourceColumns : columns}
          rows={[]}
          empty="No appointments booked for this day."
        />
      </div>

      {!isResource && (
        <PBSummaryBand title="Patient - DAYBOOK SUMMARY" links={['Change View', 'Summary/Detail', 'Hide']} />
      )}
    </>
  )
}
