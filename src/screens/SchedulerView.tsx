import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import {
  PBButton, PBCheckbox, PBCommandRow, PBDataWindow, PBDropField, PBInput, PBRadio,
  PBDropDownDataWindow, PBSelect, PBSummaryBand, PBTextArea, PBViewHeader,
  pbSlug, usePBInstrumentation, type PBColumn, type PBCommand,
} from '../pb'
import { daybookProviders } from '../data/mois'
import {
  APPOINTMENT_STATUSES, HIDDEN_BY_DEFAULT, RESOURCES, VISIT_CODE_FILL, weekdayOf,
} from '../data/daybook'
import {
  dayRows, encounterOf, resourceRows, schedulerStore, setSchedulerBridge, useSchedulerStore,
  type DayRow, type EncounterOpen,
} from '../data/schedulerStore'
import { shiftMinutes } from '../data/schedulerSetup'
import { useOpenWindow } from './areaWindowRegistry'

type Appt = DayRow & Record<string, string>

/* ============================================================================
   Scheduler ▸ Provider Schedules ▸ Day Book, and its resource twin.

   Column set, row pitch and the visit-code palette are transcribed from
   `Screenshot_2024-01-02_160729.png` (MOIS v02.30.22, 1920 px, maximised);
   the v02.30.22 captures in the manual (art. 303834 `d2620a14…` /
   `a62ac8da…` / `74e88fd1…`) add the Launch Provider Virtual Room… button,
   the green LFP Time strip under the time bar, the appointment bars on the
   time bar, and `I` / `-` in every untouched flag cell.

   The two day books are one DataWindow with one column swapped: the provider
   book names the Resource, the resource book names the Provider. The field
   audit counts 24 columns on Provider Schedules ▸ Day Book (matrix rows
   1269-1292) and 22 on Resource Schedules ▸ Day Book (1299-1320) — the
   resource book stops at RP and carries no M or attachment column.

   What the day book does, from the manual:
   - View Type re-orders the columns: Provider drops Resource; Biller drops
     Room and adds `# Fees` (art. 303795).
   - The two boxes over First Name and Last Name are a jump: type and press
     Enter and the first matching patient becomes current (art. 303828).
   - Double-click (or Alt+Z) opens the appointment's Encounter Detail Window
     (art. 303845) — here only for rows on the open training chart, since
     only it has an encounter export.
   - Right-click a row: the row menu (art. 303834 `74e88fd1…`); right-click
     the blue title bar: Turn Editor - On / Save Layout / Reset Layout
     (art. 303836 `07221e59…`).
   - The time bar greys the hours outside the provider's shift (art. 303843).
   ========================================================================= */

const identityColumns: PBColumn<Appt>[] = [
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
]

/* everything past Room runs off the right-hand edge of the pane: the audit
   could not focus a single one of these without scrolling the grid
   ("The column continues beyond the visible right edge of the shared Day Book
   grid" — MATRIX-R1311-as, MATRIX-R1320-rp). */
const flagColumns: PBColumn<Appt>[] = [
  { key: 'as', header: 'AS', width: 30, align: 'center' },
  { key: 'tk', header: 'TK', width: 30, align: 'center' },
  { key: 'mg', header: 'MG', width: 32, align: 'center' },
  { key: 'issue', header: 'Health Issue', width: 92 },
  { key: 'issueDots', header: '', width: 16, align: 'center', dots: true },
  { key: 'services', header: 'Services', width: 78 },
  { key: 'payor', header: 'Payor', width: 56, align: 'center' },
  { key: 'ds', header: 'DS', width: 30, align: 'center' },
  { key: 'bs', header: 'BS', width: 30, align: 'center' },
  { key: 'tm', header: 'TM', width: 32, align: 'center' },
  { key: 'rp', header: 'RP', width: 30, align: 'center' },
]

const tailColumns: PBColumn<Appt>[] = [
  { key: 'm', header: 'M', width: 26, align: 'center' },
  { key: 'clip', header: '\u{1F4CE}', width: 22, align: 'center' },
]

/** the column keys in each View Type's order (art. 303795) */
function viewColumns(view: string): PBColumn<Appt>[] {
  const resource: PBColumn<Appt> = { key: 'resource', header: 'Resource', width: 88 }
  const room: PBColumn<Appt> = { key: 'room', header: 'Room', width: 60 }
  const fees: PBColumn<Appt> = { key: 'fees', header: '# Fees', width: 44, align: 'center' }
  if (view === 'Provider') return [...identityColumns, room, ...flagColumns, ...tailColumns]
  if (view === 'Biller') {
    const flags = [...flagColumns]
    flags.splice(flags.findIndex((c) => c.key === 'services') + 1, 0, fees)
    return [...identityColumns, resource, ...flags, ...tailColumns]
  }
  return [...identityColumns, resource, room, ...flagColumns, ...tailColumns]
}

/* The cells a lesson rings carry their own anchors: a day-book row is wider
   than the window, and the tutorial player will not ring an anchor it cannot
   fully contain. `minHeight` is load-bearing — an empty span collapses to
   0 px and driver.js then rings a box 0 px tall. */
const ANCHORED = ['services', 'bs', 'ds', 'issue', 'chart', 'first', 'last']

function decorate(
  cols: PBColumn<Appt>[],
  shown: { row: Appt; i: number }[],
  current: number,
  onStatus: (i: number, code: string) => void,
  onIssueDots: () => void,
): PBColumn<Appt>[] {
  return cols.map((c) => {
    if (c.key === 'as') {
      return {
        ...c,
        width: 45,
        render: (row: Appt, n: number) => {
          const i = shown[n]?.i ?? n
          return (
            <span data-tutorial-id={`host.mois.as.${row.hr}${row.mn}`} style={{ display: 'block', minHeight: '1em' }}>
              {n !== current ? row.as : (
                /* the AS cell turns into a drop-down when its row is current
                   (art. 303827, `qu/8876/image.png`) */
                <PBDropDownDataWindow
                  key={i}
                  w="100%"
                  value={row.as}
                  display="code"
                  columns={[
                    { key: 'code', header: 'Code', width: 46 },
                    { key: 'label', header: 'Description', width: 140 },
                  ]}
                  rows={APPOINTMENT_STATUSES}
                  onSelect={(r) => onStatus(i, String(r.code))}
                />
              )}
            </span>
          )
        },
      }
    }
    if (c.key === 'issueDots') {
      return {
        ...c,
        render: (row: Appt, n: number) => (n === current
          ? <button className="pb-dw__dots" data-tutorial-id={`host.mois.lookup.issue-${row.hr}${row.mn}`} onClick={onIssueDots}>…</button>
          : '…'),
      }
    }
    if (ANCHORED.includes(c.key)) {
      return {
        ...c,
        render: (row: Appt) => (
          <span data-tutorial-id={`host.mois.cell.${c.key}-${row.hr}${row.mn}`} style={{ display: 'block', minHeight: '1em' }}>
            {String(row[c.key] ?? '')}
          </span>
        ),
      }
    }
    return c
  })
}

const resourceColumns: PBColumn<Appt>[] = [
  ...identityColumns,
  { key: 'provider', header: 'Provider', width: 120 },
  { key: 'room', header: 'Room', width: 60 },
  ...flagColumns.filter((c) => c.key !== 'issueDots'),
]

/** 0:00 to 20:00: the v02.30.22 time bar opens scrolled to the morning */
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7)

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

/* PowerBuilder glues the weekday straight onto the date with a space —
   "Tuesday Aug 11, 2026", not the comma `Intl` puts after a long weekday. */
const LONG = new Intl.DateTimeFormat('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
const SHORT = new Intl.DateTimeFormat('en-CA', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
const pbDate = (f: Intl.DateTimeFormat, d: Date) => f.format(d).replace(', ', ' ')

/** the jump boxes sit over First Name and Last Name: gutter + HR…Chart */
const NAME_LEFT = 3 + 13 + 30 + 32 + 42 + 44 + 26 + 68

export function SchedulerView({
  mode = 'provider', offset = 0, onMove, provider = 'TECHNICAL SUPPORT', onProvider,
  apptRow = 0, onApptRow, onApptStatus, chart, onOpenEncounter, onOpenNode,
}: {
  mode?: 'provider' | 'resource'
  /** days from the day book's opening day; the frame owns it */
  offset?: number
  onMove?: (move: DaybookMove) => void
  /** whose day book this is; the frame owns it so a lesson can check it */
  provider?: string
  onProvider?: (provider: string) => void
  /** the day book's current row — an index into the whole day, before Hide
      Status — which the frame owns so a lesson can check it */
  apptRow?: number
  onApptRow?: (row: number) => void
  /** kept for the frame's own AS handling; the store is what records it */
  onApptStatus?: (row: number, code: string) => void
  /** the chart the frame has open: the only one whose encounters can open */
  chart?: string
  onOpenEncounter?: (row: EncounterOpen) => void
  onOpenNode?: (node: string) => void
  /** @deprecated — booking, billing and statuses live in data/schedulerStore */
  apptStatuses?: unknown; booked?: unknown; billedRows?: unknown; onBill?: unknown; onNewAppt?: unknown
}) {
  const sched = useSchedulerStore()
  const openWindow = useOpenWindow()
  const [view, setView] = useState('Scheduler')
  const [hide, setHide] = useState({ noshow: true, rebooked: true, cancelled: true, discharged: false })
  const [resource, setResource] = useState('1')
  const [jump, setJump] = useState({ first: '', last: '' })
  /* the column the editor has picked up (art. 303837: "The column will
     highlight black") */
  const [picked, setPicked] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const order = sched.columns
  const gridRef = useRef<HTMLDivElement>(null)
  const isResource = mode === 'resource'
  const host = usePBInstrumentation()

  const all: Appt[] = useMemo(
    () => (isResource ? resourceRows(resource, offset) : dayRows(sched, provider, offset)) as Appt[],
    [isResource, resource, offset, sched, provider],
  )
  const hidden = (code: string) => (
    (code === 'N' && hide.noshow) || (code === 'R' && hide.rebooked)
    || (code === 'C' && hide.cancelled) || (code === 'D' && hide.discharged)
  )
  const shown = all
    .map((row, i) => ({ row, i }))
    .filter(({ row }) => !hidden(row.as))
  const count = shown.length
  const curRow = Math.max(0, shown.findIndex(({ i }) => i === apptRow))
  const current = shown[curRow]?.row
  const day = daybookDate(offset)

  /* the menus and the Scheduler windows act on the current appointment */
  useEffect(() => {
    if (isResource) return
    if (current) schedulerStore.setCurrent(provider, offset, current.key)
  }, [isResource, provider, offset, current?.key])
  useEffect(() => {
    if (isResource) return
    setSchedulerBridge({
      chart,
      openEncounter: onOpenEncounter,
      openNode: onOpenNode,
      showDay: (to, off) => {
        onProvider?.(to)
        if (off === 0) { onMove?.('today'); return }
        for (let d = offset; d !== off; d += off > offset ? 1 : -1) onMove?.(off > offset ? 'next-day' : 'prev-day')
      },
    })
  }, [isResource, chart, onOpenEncounter, onOpenNode, onProvider, onMove, offset])

  const setStatus = (i: number, code: string) => {
    schedulerStore.setStatus(provider, offset, i, code)
    onApptRow?.(i)
    onApptStatus?.(i, code)
  }

  const openEncounter = (row: Appt | undefined) => {
    const enc = encounterOf(row, offset, chart ?? '')
    if (!enc || !row) return
    schedulerStore.openedEncounter(row.key)
    onOpenEncounter?.(enc)
  }

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

  /* the jump: Enter lands on the first patient whose name starts with it */
  const jumpTo = (field: 'first' | 'last', value: string) => {
    const want = value.trim().toUpperCase()
    if (!want) return
    const hit = shown.find(({ row }) => String(row[field]).toUpperCase().startsWith(want))
    if (hit) onApptRow?.(hit.i)
  }

  const scroll = (dx: number) => {
    const el = gridRef.current?.querySelector<HTMLElement>('.pb-dw__scroll')
    if (el) el.scrollLeft += dx
  }

  /* right-click: a row takes the current row and drops its menu; the blue
     title bar drops the editor's */
  const onContextMenu = (e: ReactMouseEvent) => {
    if (isResource) return
    const target = e.target as HTMLElement
    e.preventDefault()
    const at = { x: e.clientX, y: e.clientY }
    if (target.closest('thead')) { openWindow('daybook-header-menu', at); return }
    const tr = target.closest('tbody tr')
    if (!tr) return
    const n = [...(tr.parentElement?.children ?? [])].indexOf(tr)
    const hit = shown[n]
    if (hit) onApptRow?.(hit.i)
    openWindow('daybook-row-menu', at)
  }

  /* the editor: click a heading to pick it up, drag it onto another */
  const baseCols = viewColumns(view)
  const ordered = order
    ? [...baseCols].sort((x, y) => (order.indexOf(x.key) + 1 || 999) - (order.indexOf(y.key) + 1 || 999))
    : baseCols
  const editable = sched.editor && !isResource
  const headed = ordered.map((c) => (!editable || !c.header ? c : {
    ...c,
    header: (
      <span
        draggable
        onClick={() => setPicked(c.key)}
        onDragStart={() => { setPicked(c.key); setDragging(c.key) }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => {
          if (!dragging || dragging === c.key) return
          const keys = ordered.map((x) => x.key).filter((k) => k !== dragging)
          keys.splice(keys.indexOf(c.key), 0, dragging)
          schedulerStore.setColumns(keys)
          setDragging(null)
        }}
        style={{
          display: 'block', margin: '0 -3px', padding: '0 3px', cursor: 'col-resize',
          ...(picked === c.key ? { background: '#000', color: '#fff' } : {}),
        }}
      >
        {c.header}
      </span>
    ),
  }))
  useEffect(() => { if (!sched.editor) setPicked(null) }, [sched.editor])

  const columns = isResource
    ? resourceColumns
    : decorate(headed, shown, curRow, setStatus, () => openWindow('daybook-health-issue'))

  /* the time bar: shift hours clear, the rest grey, and a bar per booking */
  const shifts = isResource ? [] : shiftMinutes(sched.shifts, provider, weekdayOf(offset))
  const offShift = (h: number) => shifts.length > 0 && !shifts.some(([a, b]) => h * 60 >= a && h * 60 < b)

  const commands: PBCommand[] = isResource
    ? [{ label: 'New Appt', onClick: () => openWindow('new-appointment') }, { label: 'Delete Appt' }, { label: 'Save' }, { label: 'Undo' }, { label: 'Refresh' }]
    : [
      { label: 'New Appt', onClick: () => openWindow('new-appointment') },
      { label: 'Appt Series' },
      { label: 'Save' },
      { label: 'Delete Appt', disabled: !current, onClick: () => openWindow('delete-appointment') },
      { label: 'Undo' },
      { label: 'Refresh' },
      { label: 'Print List', onClick: () => openWindow('print-current-daybook') },
      { label: 'Print Encounter', width: 81 },
      { label: 'MSP Bill', onClick: () => { if (current) schedulerStore.bill(current.key) } },
      { label: 'Pre-Slot Wizard', width: 81, onClick: () => openWindow('pre-slot-wizard') },
    ]

  return (
    <>
      {isResource
        ? <PBViewHeader title={`Day Book: ${pbDate(LONG, day)}`} meta={`Appointment(s): ${count}`} right={`RESOURCE: ${resource}`} />
        : <PBViewHeader title={pbDate(SHORT, day)} meta={`Appointment(s): ${count}`} right={provider} />}
      <PBCommandRow commands={commands} />

      {/* ---- filter form: three panels divided by hairlines ---- */}
      <div className="pb-daybook-filters" style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid #c9c9c9', flex: 'none', minWidth: 800 }}>
        {/* date navigator */}
        <div style={{ padding: '5px 8px', flex: 'none', width: 196 }}>
          <div className="pb-row">
            <span style={{ width: 40 }}>Date:</span>
            <PBInput w={112} align="center" value={daybookStamp(offset)} readOnly style={{ background: '#fff' }} />
          </div>
          <div className="pb-row" style={{ marginTop: 6, gap: 3 }}>
            {/* the captures paint these as plain ASCII, not guillemets */}
            {moveButton('prev-week', '<<', 24)}
            {moveButton('prev-day', '<', 24)}
            {moveButton('today', 'Today')}
            {moveButton('next-day', '>', 24)}
            {moveButton('next-week', '>>', 24)}
          </div>
          {!isResource && (
            <PBButton style={{ marginTop: 10, width: 118, height: 34, lineHeight: '13px', whiteSpace: 'normal' }}>
              Launch Provider Virtual Room...
            </PBButton>
          )}
        </div>

        <span className="pb-vrule" style={{ margin: 0 }} />

        {isResource ? (
          <div className="pb-form" style={{ gridTemplateColumns: 'auto 1fr', flex: '1 1 auto', minWidth: 0, alignItems: 'start' }}>
            <span className="pb-form__label pb-form__label--right" style={{ lineHeight: '19px' }}>Resource</span>
            <PBSelect options={RESOURCES} w={240} value={resource} onChange={(e) => setResource(e.target.value)} />

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
              w={188}
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
            <PBDropField w={188} />
            <PBCheckbox label="Show Only" />
          </div>

          <span className="pb-form__label pb-form__label--right" style={{ lineHeight: '19px' }}>View Type:</span>
          <div className="pb-row pb-row--gap-lg" data-tutorial-id="host.mois.field.daybook-view-type">
            {['Scheduler', 'Provider', 'Biller'].map((v) => (
              <PBRadio key={v} name="viewtype" label={v} checked={view === v} onChange={() => setView(v)} />
            ))}
          </div>

          <span className="pb-form__label pb-form__label--right" style={{ lineHeight: '19px' }}>Hide Status:</span>
          <div className="pb-row pb-row--gap-lg" data-tutorial-id="host.mois.field.daybook-hide-status">
            <PBCheckbox label="No-Show" checked={hide.noshow} onChange={(v) => setHide({ ...hide, noshow: v })} tutorialId="host.mois.check.hide-no-show" />
            <PBCheckbox label="Rebooked" checked={hide.rebooked} onChange={(v) => setHide({ ...hide, rebooked: v })} />
            <PBCheckbox label="Cancelled" checked={hide.cancelled} onChange={(v) => setHide({ ...hide, cancelled: v })} tutorialId="host.mois.check.hide-cancelled" />
          </div>

          <span />
          <PBCheckbox label="Discharged" checked={hide.discharged} onChange={(v) => setHide({ ...hide, discharged: v })} />

          <span className="pb-form__label pb-form__label--right" style={{ lineHeight: '19px' }}>or Show Only:</span>
          <div className="pb-row pb-row--gap-lg">
            <span className="pb-row">AS:<PBInput w={78} /></span>
            <span className="pb-row">DS:<PBInput w={78} /></span>
          </div>
        </div>

        <span className="pb-vrule" style={{ margin: 0 }} />

        {/* MSP / comment panel */}
        <div className="pb-form" style={{ gridTemplateColumns: 'auto 1fr', flex: 'none', width: 296, alignItems: 'start' }}>
          <span className="pb-form__label" style={{ lineHeight: '19px' }}>MSP Loc.:</span>
          <div className="pb-row"><PBInput w={60} /><span style={{ marginLeft: 6 }}>Alias:</span>
            <span data-tutorial-id="host.mois.field.daybook-alias"><PBDropField w={120} /></span>
          </div>

          <span className="pb-form__label" style={{ lineHeight: '19px' }}>Comment:</span>
          <PBTextArea rows={2} w="100%" />

          <button className="pb-link" style={{ justifySelf: 'end' }}>see more</button>
          <button className="pb-link" style={{ justifySelf: 'start' }}>Create Call List</button>

          <span />
          <PBCheckbox label="Do Not Auto-Generate a Call List" />
        </div>
        </>
        )}
      </div>

      {/* ---- time bar: hour cells with quarter-hour rules, a bar per
           booking, and the hours off shift painted grey ---- */}
      <div style={{ display: 'flex', height: 42, borderBottom: '1px solid #c9c9c9', background: '#fff', flex: 'none' }} data-tutorial-id="host.mois.field.daybook-time-bar">
        {HOURS.map((h) => {
          const inHour = all.filter((r) => Number(r.hr) === h)
          return (
            <div
              key={h}
              style={{
                position: 'relative', flex: '1 1 0', borderRight: '1px solid #c9c9c9',
                fontSize: 11, fontWeight: 700, padding: '1px 0 0 4px',
                background: offShift(h) ? '#8c8c8c' : undefined,
              }}
            >
              {h}:00
              {[25, 50, 75].map((pc) => (
                <span key={pc} style={{ position: 'absolute', top: 15, bottom: 0, left: `${pc}%`, borderLeft: '1px dotted #b9b9b9' }} />
              ))}
              {inHour.map((r, k) => (
                <span
                  key={r.key}
                  title={`${r.last}, ${r.first}`}
                  style={{
                    position: 'absolute', top: 17 + (k % 4) * 6, height: 4,
                    left: `${(Number(r.mn) / 60) * 100}%`,
                    width: `${Math.min(100, ((Number(r.n) || 3) * 5 / 60) * 100)}%`,
                    background: VISIT_CODE_FILL[r.code] ?? '#808080', border: '1px solid #000',
                  }}
                />
              ))}
            </div>
          )
        })}
      </div>
      {!isResource && (
        /* the green LFP strip the v02.30.22 captures carry under the bar */
        <div className="pb-row" style={{ height: 18, background: '#ccf5c4', borderBottom: '1px solid #9bd29a', padding: '0 8px', gap: 18, color: '#555', flex: 'none' }}>
          <span>LFP Time:</span><span>Direct: -</span><span>Indirect: -</span><span>Clinical: -</span><span>Total:</span>
          <span style={{ marginLeft: 140 }}>Time Claims Billing Status:</span>
          <button className="pb-link" style={{ marginLeft: 120 }}>Edit</button>
        </div>
      )}

      {/* ---- the scroll strip: < Scroll < pans left, > Scroll > right, and
           the two jump boxes sit over First Name and Last Name ---- */}
      <div className="pb-scrollrow" style={{ position: 'relative' }}>
        {!isResource && <PBButton size="sm" style={{ minWidth: 62 }} onClick={() => scroll(-320)} data-tutorial-id="host.mois.command.scroll-left">&lt; Scroll &lt;</PBButton>}
        <span className="pb-scrollrow__spacer" />
        <span style={{ position: 'absolute', left: NAME_LEFT, top: 2, display: 'flex' }}>
          <PBInput
            w={92}
            value={jump.first}
            onChange={(e) => setJump({ ...jump, first: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') jumpTo('first', e.currentTarget.value) }}
            data-tutorial-id="host.mois.field.daybook-filter-first"
          />
          <PBInput
            w={96}
            value={jump.last}
            onChange={(e) => setJump({ ...jump, last: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') jumpTo('last', e.currentTarget.value) }}
            data-tutorial-id="host.mois.field.daybook-filter-last"
          />
        </span>
        {!isResource && <PBButton size="sm" style={{ minWidth: 62 }} onClick={() => scroll(320)} data-tutorial-id="host.mois.command.scroll-right">&gt; Scroll &gt;</PBButton>}
      </div>

      <div
        ref={gridRef}
        style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 3px 3px' }}
        onContextMenu={onContextMenu}
        data-tutorial-id="host.mois.field.daybook-grid"
      >
        <PBDataWindow
          /* the day book carries more columns than a narrow window can show
             and MOIS lets the user pan it, unlike the chart grids */
          hscroll
          columns={columns}
          rows={shown.map(({ row }) => ({ ...row, fees: row.services ? '1' : '' }) as Appt)}
          current={curRow}
          onCurrentChange={(n) => onApptRow?.(shown[n]?.i ?? 0)}
          onActivate={(row) => openEncounter(row)}
          rowFill={(row) => VISIT_CODE_FILL[row.code]}
          rowClassName={(row) => {
            const code = row.as
            if (code === 'A' || code === 'I' || code === 'S') return 'pb-dw--arrived'
            return HIDDEN_BY_DEFAULT.has(code) ? 'pb-dw--struck' : undefined
          }}
          rowTutorialId={(row) => `host.mois.row.appt-${row.hr}${row.mn}`}
          /* a day with no appointments paints a bare grid — every day-book
             capture reads "Appointment(s): 0" and carries no message */
          empty=""
        />
      </div>

      {!isResource && (
        <PBSummaryBand title="Patient - DAYBOOK SUMMARY" links={['Change View', 'Summary/Detail', 'Hide']} />
      )}
    </>
  )
}
