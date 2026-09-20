import { useState } from 'react'
import {
  PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBDropField, PBInput, PBRadio,
  PBDropDownDataWindow, PBSelect, PBSummaryBand, PBTextArea, PBViewHeader,
  pbSlug, usePBInstrumentation, type PBColumn, type PBCommand,
} from '../pb'
import { daybookProviders } from '../data/mois'
import {
  APPOINTMENT_STATUSES, HIDDEN_BY_DEFAULT, VISIT_CODE_FILL,
  daybookAppointments, type Appointment,
} from '../data/daybook'

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

/* The AS cell turns into a drop-down when its row is current: the capture in
   art. 303827 shows the chevron on the selected row only, with the two-column
   Code / Description list hanging below it. */
function asColumns(
  statusOf: (i: number) => string,
  shown: { row: Appointment; i: number }[],
  current: number,
  onApptStatus?: (row: number, code: string) => void,
): PBColumn<Appt>[] {
  /* A day-book row is wider than the window, and the tutorial player will not
     ring an anchor it cannot fully contain — so the cells a lesson needs to
     point at carry their own anchors.

     `minHeight` is load-bearing, not cosmetic. Most day-book cells are empty
     in the fixture, and a `display: block` span around an empty string
     collapses to zero height: the anchor exists, `querySelector` finds it, and
     driver.js then rings a box 83 px wide and 0 px tall. It looks like the
     lesson is pointing at nothing. */
  const celled = columns.map((c) => (
    ['services', 'bs', 'issue'].includes(c.key)
      ? {
        ...c,
        render: (row: Appt) => (
          <span
            data-tutorial-id={`host.mois.cell.${c.key}-${row.hr}${row.mn}`}
            style={{ display: 'block', minHeight: '1em' }}
          >
            {String(row[c.key] ?? '')}
          </span>
        ),
      }
      : c
  ))
  return celled.map((c) => (c.key !== 'as' ? c : {
    ...c,
    width: 45,
    render: (row: Appt, n: number) => {
      const i = shown[n]?.i ?? n
      /* the cell carries its own anchor: a lesson rings the AS cell rather
         than the row, which runs past the grid's horizontal scroll */
      return (
        <span
          data-tutorial-id={`host.mois.as.${row.hr}${row.mn}`}
          style={{ display: 'block', minHeight: '1em' }}
        >
          {n !== current ? row.as : (
            <PBDropDownDataWindow
              key={i}
              w="100%"
              value={statusOf(i)}
              display="code"
              columns={[
                { key: 'code', header: 'Code', width: 46 },
                { key: 'label', header: 'Description', width: 140 },
              ]}
              rows={APPOINTMENT_STATUSES}
              onSelect={(r) => onApptStatus?.(i, String(r.code))}
            />
          )}
        </span>
      )
    },
  }))
}

const resourceColumns: PBColumn<Appt>[] = [
  ...columns.slice(0, 10),
  { key: 'provider', header: 'Provider', width: 120 },
  { key: 'room', header: 'Room', width: 60 },
]

const HOURS = ['8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00']

/* The provider and resource day books are the same window with a different
   filter block: the resource view drops the MSP/call-list panel, the extra
   print commands, the Discharged filter and the summary strip. */
/* The day the training day book opens on, and the moves the manual's "How to
   Change the Date on the Day Book" lists: F7/F8 a day either way, Page
   Up/Page Down a week, and Today back to the start. */
const DAYBOOK_EPOCH = new Date(2026, 7, 11)
const DAYBOOK_MOVES = { 'prev-week': -7, 'prev-day': -1, today: 0, 'next-day': 1, 'next-week': 7 } as const
export type DaybookMove = keyof typeof DAYBOOK_MOVES

export function daybookDate(offset: number): Date {
  const d = new Date(DAYBOOK_EPOCH)
  d.setDate(d.getDate() + offset)
  return d
}

/** `2026.08.11`, the way the Date field prints it. */
export function daybookStamp(offset: number): string {
  const d = daybookDate(offset)
  const two = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${two(d.getMonth() + 1)}.${two(d.getDate())}`
}

/** Where a move lands, so the frame can hold the offset rather than a date. */
export function daybookOffsetAfter(offset: number, move: DaybookMove): number {
  return move === 'today' ? 0 : offset + DAYBOOK_MOVES[move]
}

const LONG = new Intl.DateTimeFormat('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
const SHORT = new Intl.DateTimeFormat('en-CA', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })

export function SchedulerView({
  mode = 'provider', offset = 0, onMove, provider = 'TECHNICAL SUPPORT', onProvider,
  apptRow = 0, apptStatuses, onApptRow, onApptStatus, booked, onNewAppt,
  billedRows, onBill,
}: {
  mode?: 'provider' | 'resource'
  /** days from the day book's opening day; the frame owns it */
  offset?: number
  onMove?: (move: DaybookMove) => void
  /** whose day book this is; the frame owns it so a lesson can check it */
  provider?: string
  onProvider?: (provider: string) => void
  /** the day book's current row, and the AS code set against each row — the
      frame owns both so a lesson can check "this one is marked Arrived" */
  apptRow?: number
  apptStatuses?: Record<number, string>
  onApptRow?: (row: number) => void
  onApptStatus?: (row: number, code: string) => void
  /** appointments booked from the New Appointment window this session */
  booked?: Appointment[]
  onNewAppt?: () => void
  /** appointments billed this session; the frame owns it so a lesson can grade it */
  billedRows?: Set<number>
  onBill?: (row: number) => void
}) {
  const [view, setView] = useState('Scheduler')
  const [hide, setHide] = useState({ noshow: true, rebooked: true, cancelled: true, discharged: false })
  const isResource = mode === 'resource'
  const host = usePBInstrumentation()

  /* MOIS paints the row in its visit code's colour and marks the status in
     the ink: blue once Arrived, struck through once No Show, Rebooked or
     Cancelled (art. 303827). Hide Status then drops those rows from view. */
  const statuses = apptStatuses ?? {}
  const statusOf = (i: number) => statuses[i] ?? ''
  const hidden = (code: string) => (
    (code === 'N' && hide.noshow) || (code === 'R' && hide.rebooked)
    || (code === 'C' && hide.cancelled) || (code === 'D' && hide.discharged)
  )
  /* MSP Bill (Ctrl+B) enters the age-appropriate office-visit fee code, raises
     an unsent claim and flips BS — Billing Status — to C for Complete. */
  const billed = billedRows ?? new Set<number>()
  const all = booked?.length
    ? [...daybookAppointments, ...booked].sort((x, y) => (x.hr + x.mn).localeCompare(y.hr + y.mn))
    : daybookAppointments
  const shown = isResource ? [] : all
    .map((row: Appointment, i: number) => ({ row, i }))
    .filter(({ i }) => !hidden(statusOf(i)))
  const count = shown.length
  const curRow = Math.max(0, shown.findIndex(({ i }) => i === apptRow))
  const day = daybookDate(offset)
  const moveButton = (move: DaybookMove, label: string, width?: number) => (
    <PBButton
      size={width ? 'sm' : undefined}
      style={width ? { width } : { flex: '1 1 auto', minWidth: 0 }}
      data-tutorial-id={host?.anchor('daybook', move)}
      onClick={() => { host?.report('daybook', { move }); onMove?.(move) }}
    >
      {label}
    </PBButton>
  )

  return (
    <>
      {isResource
        ? <PBViewHeader title={`Day Book: ${LONG.format(day)}`} meta={`Appointment(s): ${count}`} right={provider} />
        : <PBViewHeader title={SHORT.format(day)} meta={`Appointment(s): ${count}`} right={provider} />}
      <PBCommandRow
        commands={[
          { label: 'New Appt', onClick: onNewAppt }, { label: 'Appt Series' }, { label: 'Save', disabled: true },
          { label: 'Delete Appt', disabled: true }, { label: 'Undo', disabled: true }, { label: 'Refresh' },
          ...(isResource ? [] : [
            null,
            { label: 'Print List' }, { label: 'Print Encounter', width: 100 }, { label: 'MSP Bill', onClick: () => onBill?.(apptRow) },
            { label: 'Pre-Slot Wizard', width: 100 },
          ] as PBCommand[]),
        ]}
      />

      {/* ---- filter form: three panels divided by hairlines ---- */}
      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid #c9c9c9', flex: 'none', minWidth: 940 }}>
        {/* date navigator */}
        <div style={{ padding: '5px 8px', flex: 'none', width: 196 }}>
          <div className="pb-row">
            <span style={{ width: 40 }}>Date:</span>
            <PBInput w={112} align="center" value={daybookStamp(offset)} readOnly />
          </div>
          <div className="pb-row" style={{ marginTop: 6, gap: 3 }}>
            {moveButton('prev-week', '\u00ab', 24)}
            {moveButton('prev-day', '\u2039', 24)}
            {moveButton('today', 'Today')}
            {moveButton('next-day', '\u203a', 24)}
            {moveButton('next-week', '\u00bb', 24)}
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
          <div className="pb-row" data-tutorial-id={host?.anchor('daybookfor')}>
            <PBDropDownDataWindow
              w={244}
              value={provider}
              display="provider"
              columns={[
                { key: 'provider', header: 'Provider', width: 170 },
                { key: 'type', header: 'Type', width: 130 },
                { key: 'loc', header: 'Service Location' },
              ]}
              rows={daybookProviders}
              onSelect={(row) => {
                host?.report('daybookFor', { provider: pbSlug(String(row.provider)) })
                onProvider?.(String(row.provider))
              }}
            />
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
          <div className="pb-row"><PBInput w={78} /><span style={{ marginLeft: 12 }}>Alias:</span>
            <span data-tutorial-id="host.mois.field.daybook-alias"><PBDropField w={160} /></span>
          </div>

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
        <PBInput w={72} data-tutorial-id="host.mois.field.daybook-filter-first" />
        <PBInput w={72} data-tutorial-id="host.mois.field.daybook-filter-last" />
        <span className="pb-scrollrow__spacer" />
        <PBButton size="sm" style={{ minWidth: 62 }}>&rsaquo; Scroll &rsaquo;</PBButton>
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 3px 3px' }}>
        <PBDataWindow
          /* the day book carries more columns than a narrow window can show
             and MOIS lets the user pan it, unlike the chart grids */
          hscroll
          columns={isResource ? resourceColumns : asColumns(statusOf, shown, curRow, onApptStatus)}
          rows={shown.map(({ row, i }) => ({
            ...row,
            as: statusOf(i),
            ...(billed.has(i) ? { services: '00100', bs: 'C' } : {}),
          }))}
          current={curRow}
          onCurrentChange={(n) => onApptRow?.(shown[n]?.i ?? 0)}
          rowFill={(row) => VISIT_CODE_FILL[row.code]}
          rowClassName={(_row, n) => {
            const code = statusOf(shown[n]!.i)
            if (code === 'A' || code === 'I' || code === 'S') return 'pb-dw--arrived'
            return HIDDEN_BY_DEFAULT.has(code) ? 'pb-dw--struck' : undefined
          }}
          rowTutorialId={(row) => `host.mois.row.appt-${row.hr}${row.mn}`}
          empty="No appointments booked for this day."
        />
      </div>

      {!isResource && (
        <PBSummaryBand title="Patient - DAYBOOK SUMMARY" links={['Change View', 'Summary/Detail', 'Hide']} />
      )}
    </>
  )
}
