import { Fragment, useEffect, useMemo, useState } from 'react'
import { isOn, useSystemSetting } from '../data/accessSettings'
import { useChartExport } from '../data/chart-records'
import { marDrugName } from '../data/marDrugCodes'
import { marOrdersFromExport, practiceOrder, type MarEvent, type MarOrder } from '../data/marOrders'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { useEncounterSession } from '../host/encounterArea'
import { useScreenReport } from '../host/screen-state'
import { useScreenWindow, useSessionState } from '../host/screen-windows'
import {
  PBButton, PBCommandRow, PBDataWindow, PBIdentityStrip, PBInput, PBLookup, PBRadio, PBSelect, PBViewHeader, pbSlug,
  type PBMenuItem,
} from '../pb'
import { useOpenWindow } from './areaWindowRegistry'
import {
  DOSE_ACTIONS, MAR_ACTION_WINDOWS, MarDrugCodeLookupWindow, MarNewOrderWindow, MarNotGivenWindow, MarRescheduleWindow,
  MarScheduledRecordWindow, MarStatusSelectionWindow, doseCount, type MarDoseAction, type MarOrderDraft,
} from './MarActionWindows'
import {
  MAR_CHOICES, MAR_WINDOWS, MarCancelOrderWindow, MarCancelWarningBox, MarChooserWindow,
  MarDeleteWindow, MarOrderWindow, MarRecordWindow, type MarKind,
} from './MarWindows'
import { contextPoint, RowContextMenu, type ContextMenuAt } from './RowContextMenu'
import { StageMessageBox } from './StageWindow'
import './mar.css'

/* ============================================================================
   Medication Administration Record — the MAR list.

   PROVENANCE: 303427 `96b03747…png` (Group by Parent Order) and `f3bae7f6…png`
   (List View), both v02.18.17; 1927481 `70e81e88…png` and 1664605
   `9f2fc2ac…png` (v02.30.11); 1741600 `169730ee…png` (an order expanded, with
   its right-click menu) and `e3a35fc4…png` (the same order cancelled).

   - Title "Medication Administration Record"; the command row is New … ·
     Open Parent Order · Open Record · Refresh.
   - A pale-blue filter band: Record Status (All… + "…"), Search For ("List
     for…"), Record Limits ▾; then Expand All · Collapse All and View ▾ — List
     View, Group by Medication, Group by Parent Order (the default).
   - Grouped, the heads read Order Date · Medication · Order By · Detail ·
     Admin / Total; an order is a grey band with its "(a / t records)" count,
     and expanding it lists its events: status, date and time, medication,
     dose. SCHEDULED doses are blue, overdue ones red. List View's columns are
     Date · Status · Generic Name [Brand Name] · Series · Dose · Units.
   - Right-click: New … · Open Parent Order · Refresh | Expand All · Collapse
     All.
   - A cancelled order and every one of its doses read CANCELLED, struck
     through in grey, in every view.

   The earlier version of this window was built from the tdt_mar detail
   record's fields (Given By / Dosage / Route / Site as columns) — those are
   fields of the record window, not columns of this list.

   303427 in full (stream C2):
   - View ▾ has the fourth view, Grid View (`89100b03…png`): one row per
     medication, one column per administration date (date over time), the
     cell carrying the status (ADMINISTERED on green), Asc / Desc radios
     beside View, and << < > >> under the grid paging the dates.
   - With System Settings' MAR Ordering OFF, Group by Parent Order goes from
     View ▾ and the chooser keeps its four non-order choices (`0f376e75…`,
     `a5be44cc…`, `3ba5db00…`).
   - Record Status's "…" opens the Multi-Value Selection of the eleven
     statuses (`f7908f40…`); Search For filters on medication, date and
     administered by; Record Limits keeps the newest 10 / 20.
   - Maintenance ▸ Save Window Options as My Defaults (`e2d11224…`) keeps
     the view and filters for the next time the folder opens.
   - The right-click menu follows what is under the pointer (`39711c3a…`,
     `f625cf01…`): on a dose New … · Open Record · Refresh, then for a
     SCHEDULED dose Dispense · Administer ▸ (Administered, Witnessed,
     Self-Administered, Other Provider) · Reschedule · Cancel, then Create
     Task · Create Message · Create Reminder · Create Recall · View Recalls
     (and Tag to Care Plan on a dose that is not scheduled).
   - Open Record on a SCHEDULED dose opens the Scheduled Record
     (`1494e901…`); its seven actions close that dose off: Administered /
     Witnessed / Self-Administered / Other Provider through the record
     window, Rescheduled and Not Given through their own windows
     (screens/MarActionWindows.tsx), Dispensed at once.
   - New … routes each of the eight choices to its window; MAR Require
     Encounter = YES refuses a new record while no encounter is active.

   Anchors, beyond the kit's command/row ones: host.mois.field.mar-view,
   host.mois.field.mar-search, host.mois.field.mar-record-limits,
   host.mois.lookup.mar-record-status, host.mois.field.mar-grid-asc / -desc,
   host.mois.command.mar-grid-{first,prev,next,last}, grid cells
   host.mois.cell.mar-grid-<med>-<date>. Reported: host.screen.record
   (saved / deleted / cancelled / administered / witnessed / rescheduled /
   refused … / order-signed / order-saved / defaults-saved), .marView.
   ========================================================================= */

type Sel = { order: string; event?: string }
type MarSession = {
  added: MarOrder[]; deleted: string[]; cancelled: string[]
  /** a dose closed off from its order: event id → what changed */
  changes?: Record<string, Partial<MarEvent>>
  /** doses a reschedule added to an order: order id → events */
  extra?: Record<string, MarEvent[]>
}
type MarDefaults = { view?: string; asc?: boolean; statuses?: string[]; limit?: string }

const ALL_VIEWS = ['List View', 'Grid View', 'Group by Medication', 'Group by Parent Order']
const LIMITS = ['All Records', 'Last 10', 'Last 20']
const GRID_PAGE = 6

/** The Scheduled Record's action → the New … choice whose window records it. */
const ACTION_KIND: Partial<Record<MarDoseAction, MarKind>> = {
  administered: 'administer', witnessed: 'witness', 'self-administered': 'self', 'other-provider': 'history',
}

const stamp = () => new Date().toTimeString().slice(0, 5)
const newId = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('.').map(Number)
  const t = new Date(Date.UTC(y || 2026, (m || 1) - 1, (d || 1) + n))
  return `${t.getUTCFullYear()}.${String(t.getUTCMonth() + 1).padStart(2, '0')}.${String(t.getUTCDate()).padStart(2, '0')}`
}

export function MarView() {
  const data = useChartExport()
  const patient = usePatient()
  const win = useScreenWindow()
  const openFrame = useOpenWindow()
  const area = useEncounterSession()
  const ordering = isOn(useSystemSetting('MAR Ordering'))
  const requireEncounter = isOn(useSystemSetting('MAR Require Encounter'))
  const [session, setSession] = useSessionState<MarSession>(`mar:${patient.chart}`, { added: [], deleted: [], cancelled: [] })
  const [defaults, setDefaults] = useSessionState<MarDefaults>('mar:defaults', {})
  const views = ordering ? ALL_VIEWS : ALL_VIEWS.filter((v) => v !== 'Group by Parent Order')
  const [viewPick, setView] = useState(defaults.view ?? 'Group by Parent Order')
  const view = views.includes(viewPick) ? viewPick : 'Group by Medication'
  const [asc, setAsc] = useState(defaults.asc ?? false)
  const [statuses, setStatuses] = useState<string[]>(defaults.statuses ?? [])
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(defaults.limit ?? LIMITS[0]!)
  const [gridPage, setGridPage] = useState(0)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [sel, setSel] = useState<Sel | null>(null)
  const [menuAt, setMenuAt] = useState<ContextMenuAt>(null)
  const [menuFor, setMenuFor] = useState<'order' | 'event'>('order')
  const [record, setRecord] = useState('')
  const [choice, setChoice] = useState(0)
  const [picked, setPicked] = useState<{ name: string; seq: number } | undefined>(undefined)

  /* the export's orders, the stage's running order, and what was added here;
     a cancelled order and its doses read CANCELLED; a closed-off dose
     carries its change, and a rescheduled dose's replacement is added */
  const allOrders = useMemo<MarOrder[]>(() => {
    const all = [...session.added, practiceOrder(), ...marOrdersFromExport(data)]
    return all
      .map((o) => ({
        ...o,
        events: [...(session.extra?.[o.id] ?? []), ...o.events]
          .filter((e) => !session.deleted.includes(e.id))
          .map((e) => ({ ...e, ...(session.changes?.[e.id] ?? {}) })),
      }))
      .filter((o) => o.events.length > 0 || session.cancelled.includes(o.id))
      .map((o) => (session.cancelled.includes(o.id)
        ? { ...o, events: o.events.map((e) => (e.status === 'SCHEDULED' ? { ...e, status: 'CANCELLED' } : e)) }
        : o))
      .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
  }, [data, session])

  /* Record Status, Search For and Record Limits cut the events shown */
  const orders = useMemo<MarOrder[]>(() => {
    const term = search.trim().toLowerCase()
    const keep = (e: MarEvent) => (!statuses.length || statuses.includes(e.status))
      && (!term || [e.generic, e.med, e.date, e.by].some((x) => (x ?? '').toLowerCase().includes(term)))
    const cut = allOrders.map((o) => ({ ...o, events: o.events.filter(keep) }))
      .filter((o) => o.events.length > 0 || (!statuses.length && !term))
    const n = limit === 'Last 10' ? 10 : limit === 'Last 20' ? 20 : 0
    if (!n) return cut
    const newest = new Set(cut.flatMap((o) => o.events).sort((a, b) => b.date.localeCompare(a.date)).slice(0, n).map((e) => e.id))
    return cut.map((o) => ({ ...o, events: o.events.filter((e) => newest.has(e.id)) })).filter((o) => o.events.length > 0)
  }, [allOrders, statuses, search, limit])

  const cancelled = (o: MarOrder) => session.cancelled.includes(o.id)
  const selOrder = orders.find((o) => o.id === sel?.order)
  const selEvent = selOrder?.events.find((e) => e.id === sel?.event)
  const args = win.window?.args ?? {}
  const argEvent = typeof args.event === 'string' ? args.event : undefined
  const findEvent = (id?: string) => {
    if (!id) return null
    for (const o of allOrders) { const e = o.events.find((x) => x.id === id); if (e) return { o, e } }
    return null
  }
  /* a window opened by name (a lesson's openUtility) with no row picked acts
     on the first order that has what it needs */
  const orderFor = (need: 'running' | 'administered') => selOrder ?? orders.find((o) => (need === 'running'
    ? o.events.some((e) => e.status === 'SCHEDULED') : o.events.some((e) => e.status === 'ADMINISTERED')))
  const detailTarget = (() => {
    const hit = findEvent(argEvent)
    if (hit) return hit
    if (selEvent && selOrder) return { o: selOrder, e: selEvent }
    const o = orderFor('administered')
    const e = o?.events.find((x) => x.status === 'ADMINISTERED')
    if (o && e) return { o, e }
    /* no administered dose listed yet (the export still loading): the first dose */
    const first = orders.find((x) => x.events.length)
    return first ? { o: first, e: first.events[0]! } : null
  })()
  /* the dose a Scheduled Record / Reschedule / Not Given acts on */
  const scheduledTarget = (() => {
    const hit = findEvent(argEvent)
    if (hit) return hit
    if (selEvent && selOrder && selEvent.status === 'SCHEDULED') return { o: selOrder, e: selEvent }
    const o = orderFor('running')
    const e = o?.events.filter((x) => x.status === 'SCHEDULED').sort((a, b) => a.date.localeCompare(b.date))[0]
    return o && e ? { o, e } : null
  })()

  /* `row` is the selected line's anchor slug, which host.mois.selectRow grades */
  const selRow = !selOrder ? '' : selEvent ? `mar-${pbSlug(selEvent.status)}-${pbSlug(selEvent.date)}` : `mar-order-${pbSlug(selOrder.med).slice(0, 40)}`
  useScreenReport({ record, rows: orders.length, draft: false, row: selRow, marView: pbSlug(view) })

  /* ---- what the windows write ---------------------------------------- */
  const addOrder = (order: MarOrder) => setSession((s) => ({ ...s, added: [order, ...s.added] }))
  const changeEvent = (id: string, patch: Partial<MarEvent>) => setSession((s) => ({ ...s, changes: { ...(s.changes ?? {}), [id]: { ...(s.changes?.[id] ?? {}), ...patch } } }))
  const oneDose = (entry: MarEvent, orderBy = 'TECHNICAL SUPPORT'): MarOrder => ({
    id: newId('stage-order'),
    orderDate: MOIS_TODAY, orderTime: entry.time, med: entry.generic || '(no medication)', orderBy,
    detail: `${[entry.dose, entry.units].filter(Boolean).join(' ')}   for 1 DOSE`, dosage: entry.dose, dosageUnit: entry.units,
    frequency: '', duration: '1', durationUnit: 'DOSE', route: '', signed: { action: 'SIGNED', note: '', on: `${MOIS_TODAY} - TECHNICAL SUPPORT` },
    created: `${MOIS_TODAY}  TECHNICAL SUPPORT`, modified: '', events: [{ ...entry, id: newId('stage-event') }],
  })
  const blankEvent = (status: string, med: string, extra: Partial<MarEvent> = {}): MarEvent => ({
    id: newId('stage-event'), status, date: MOIS_TODAY, time: stamp(), med, generic: med, dose: '', units: '', series: '', site: '', lot: '', by: 'TECHNICAL SUPPORT', ...extra,
  })

  const startNew = () => {
    /* MAR Require Encounter: "MOIS will show an Error message that prevents
       a new MAR record from being created" */
    if (requireEncounter && !area.activeEncounter) { win.open(MAR_ACTION_WINDOWS.requireEncounter); return }
    setPicked(undefined)
    win.open(MAR_WINDOWS.chooser)
  }
  const continueChoice = (i: number) => {
    setChoice(i)
    const kind = MAR_CHOICES[i]?.kind
    if (kind === 'order') win.open(MAR_ACTION_WINDOWS.newOrder)
    else if (kind === 'reschedule') win.open(MAR_ACTION_WINDOWS.reschedule)
    else if (kind === 'not-given') win.open(MAR_ACTION_WINDOWS.notGiven)
    else win.open(MAR_WINDOWS.record, { choice: i })
  }
  /* a scheduled dose's action, from the Scheduled Record or the right-click */
  const doseAction = (action: MarDoseAction, eventId: string) => {
    setPicked(undefined)
    if (action === 'dispensed') {
      changeEvent(eventId, { status: 'DISPENSED', date: MOIS_TODAY, time: stamp(), by: 'TECHNICAL SUPPORT' })
      setRecord('dispensed')
      win.close()
      return
    }
    if (action === 'rescheduled') { win.open(MAR_ACTION_WINDOWS.reschedule, { event: eventId }); return }
    if (action === 'not-given') { win.open(MAR_ACTION_WINDOWS.notGiven, { event: eventId }); return }
    const kind = ACTION_KIND[action]!
    win.open(MAR_WINDOWS.record, { choice: MAR_CHOICES.findIndex((c) => c.kind === kind), closes: eventId })
  }

  const openOrder = () => { if (selOrder ?? orderFor('running')) win.open(MAR_WINDOWS.order) }
  const openRecord = () => {
    if (!selEvent) return
    if (selEvent.status === 'SCHEDULED') win.open(MAR_ACTION_WINDOWS.scheduled, { event: selEvent.id })
    else win.open(MAR_WINDOWS.detail, { event: selEvent.id })
  }
  const expandAll = () => setOpen(new Set(groups.map((g) => g.key)))
  const collapseAll = () => setOpen(new Set())

  /* Maintenance ▸ Save Window Options as My Defaults arrives by name */
  const slot = win.window?.id
  useEffect(() => {
    if (slot !== MAR_ACTION_WINDOWS.saveOptions) return
    setDefaults({ view, asc, statuses, limit })
    setRecord('defaults-saved')
    win.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot])

  const who = { chart: patient.chart, patient: `${patient.last}, ${patient.first}`.toUpperCase() }
  const linkedTo = ['MEDICATION ADMINISTRATION', selEvent?.date, selEvent?.generic].filter(Boolean).join(' ')
  const workflow: PBMenuItem[] = [
    { label: 'Create Task', onSelect: () => openFrame('create-task', { ...who, linkedTo }) },
    { label: 'Create Message', onSelect: () => openFrame('create-message', { ...who, linkedTo }) },
    { label: 'Create Reminder' },
    { label: 'Create Recall', onSelect: () => openFrame('create-recall', who) },
    { label: 'View Recalls', onSelect: () => openFrame('patient-recall-list', who) },
  ]
  const eventMenu: PBMenuItem[] = !selEvent ? [] : [
    { label: 'New …', onSelect: startNew },
    { label: 'Open Record', onSelect: openRecord },
    { label: 'Refresh' },
    { sep: true },
    ...(selEvent.status === 'SCHEDULED' && !cancelled(selOrder!) ? [
      { label: 'Dispense', onSelect: () => doseAction('dispensed', selEvent.id) },
      { label: 'Administer', menu: DOSE_ACTIONS.filter(([a]) => ACTION_KIND[a]).map(([a, label]): PBMenuItem => ({ label, onSelect: () => doseAction(a, selEvent.id) })) },
      { label: 'Reschedule', onSelect: () => doseAction('rescheduled', selEvent.id) },
      { label: 'Cancel', onSelect: () => doseAction('not-given', selEvent.id) },
      { sep: true },
      ...workflow,
    ] : [...workflow, { label: 'Tag to Care Plan', onSelect: () => openFrame('tag-to-care-plan') }]),
  ]
  const orderMenu: PBMenuItem[] = [
    { label: 'New …', onSelect: startNew },
    { label: 'Open Parent Order', disabled: !selOrder || !ordering, onSelect: openOrder },
    { label: 'Refresh' },
    { sep: true },
    { label: 'Expand All', onSelect: expandAll },
    { label: 'Collapse All', onSelect: collapseAll },
  ]
  const menu = menuFor === 'event' && selEvent ? eventMenu : orderMenu

  const status = (e: MarEvent, o: MarOrder) => (cancelled(o) ? 'pb-mar-struck'
    : e.status === 'SCHEDULED' ? (e.date < MOIS_TODAY ? 'pb-mar-event--overdue' : 'pb-mar-event--scheduled') : '')
  const admin = (o: MarOrder) => o.events.filter((e) => e.status !== 'SCHEDULED' && e.status !== 'CANCELLED' && e.status !== 'NOT SCHEDULED').length

  /* the grouped views: one band per order (or per medication) and its events */
  const groups = view === 'Group by Medication'
    ? [...new Set(orders.map((o) => o.med))].map((med) => ({ key: `med:${med}`, orders: orders.filter((o) => o.med === med) }))
    : orders.map((o) => ({ key: o.id, orders: [o] }))

  const grouped = (
    <div className="pb-mar-list" data-tutorial-id="host.mois.group.mar-list"
      onContextMenu={(e) => { setMenuFor((e.target as HTMLElement).closest('.pb-mar-event') ? 'event' : 'order'); setMenuAt(contextPoint(e)) }}>
      <div className="pb-mar-head">
        <span /><span>{view === 'Group by Medication' ? '' : 'Order Date'}</span><span>Medication</span>
        <span>{view === 'Group by Medication' ? '' : 'Order By'}</span><span>{view === 'Group by Medication' ? '' : 'Detail'}</span>
        <span className="pb-mar__count">Admin / Total</span>
      </div>
      {groups.map((g) => {
        const o = g.orders[0]!
        const events = g.orders.flatMap((x) => x.events.map((e) => ({ e, o: x })))
        const isOpen = open.has(g.key)
        const struck = g.orders.every(cancelled)
        return (
          <Fragment key={g.key}>
            <div
              className={['pb-mar-order', sel?.order === o.id && !sel.event ? 'is-current' : '', struck ? 'pb-mar-struck' : ''].join(' ')}
              data-tutorial-id={`host.mois.row.mar-order-${pbSlug(o.med).slice(0, 40)}`}
              onMouseDown={() => setSel({ order: o.id })}
              onDoubleClick={() => setOpen((s) => { const n = new Set(s); n.has(g.key) ? n.delete(g.key) : n.add(g.key); return n })}
            >
              <button type="button" className="pb-mar__box" aria-expanded={isOpen}
                data-tutorial-id={`host.mois.group.mar-${pbSlug(o.med).slice(0, 40)}`}
                onClick={() => setOpen((s) => { const n = new Set(s); n.has(g.key) ? n.delete(g.key) : n.add(g.key); return n })}>
                {isOpen ? '−' : '+'}
              </button>
              <span>{view === 'Group by Medication' ? '' : o.orderDate}</span>
              <span>{o.med}</span>
              <span>{view === 'Group by Medication' ? '' : o.orderBy}</span>
              <span>{view === 'Group by Medication' ? '' : o.detail}</span>
              <span className="pb-mar__count">({g.orders.reduce((n, x) => n + admin(x), 0)} / {events.length} records)</span>
            </div>
            {isOpen && events.map(({ e, o: x }) => (
              <div
                key={e.id}
                className={['pb-mar-event', status(e, x), sel?.event === e.id ? 'is-current' : ''].join(' ')}
                data-tutorial-id={`host.mois.row.mar-${pbSlug(e.status)}-${pbSlug(e.date)}`}
                onMouseDown={() => setSel({ order: x.id, event: e.id })}
                onDoubleClick={() => {
                  setSel({ order: x.id, event: e.id })
                  win.open(e.status === 'SCHEDULED' ? MAR_ACTION_WINDOWS.scheduled : MAR_WINDOWS.detail, { event: e.id })
                }}
              >
                <span />
                <span>{e.status}</span>
                <span>{e.date}&nbsp;&nbsp;&nbsp;{e.time}</span>
                <span>{e.generic}</span>
                <span style={{ textAlign: 'right' }}>{[e.dose, e.units].filter(Boolean).join(' ')}</span>
              </div>
            ))}
          </Fragment>
        )
      })}
      <RowContextMenu at={menuAt} items={menu} onClose={() => setMenuAt(null)} />
    </div>
  )

  const listRows = orders.flatMap((o) => o.events.map((e) => ({ ...e, order: o.id, struck: cancelled(o) })))
    .sort((a, b) => b.date.localeCompare(a.date))
  const list = (
    <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', padding: '0 3px 3px', position: 'relative' }}
      onContextMenu={(e) => { setMenuFor('event'); setMenuAt(contextPoint(e)) }}>
      <PBDataWindow
        rows={listRows}
        current={Math.max(0, listRows.findIndex((r) => r.id === sel?.event))}
        onCurrentChange={(i) => setSel({ order: listRows[i]!.order, event: listRows[i]!.id })}
        onActivate={(r) => win.open(r.status === 'SCHEDULED' ? MAR_ACTION_WINDOWS.scheduled : MAR_WINDOWS.detail, { event: r.id })}
        rowClassName={(r) => (r.struck ? 'pb-dw--struck' : r.status === 'SCHEDULED' ? (r.date < MOIS_TODAY ? 'pb-mar-event--overdue' : 'pb-mar-event--scheduled') : undefined)}
        rowTutorialId={(r) => `host.mois.row.mar-${pbSlug(r.status)}-${pbSlug(r.date)}`}
        columns={[
          { key: 'date', header: 'Date', width: 78, align: 'center' },
          { key: 'status', header: 'Status', width: 124 },
          { key: 'med', header: 'Generic Name [Brand Name]', headAlign: 'center' },
          { key: 'series', header: 'Series', width: 52, align: 'center' },
          { key: 'dose', header: 'Dose', width: 38, align: 'center' },
          { key: 'units', header: 'Units', width: 62 },
        ]}
        empty="No medication administrations recorded."
      />
      <RowContextMenu at={menuAt} items={menu} onClose={() => setMenuAt(null)} />
    </div>
  )

  /* Grid View (`89100b03…png`): medications down, administration times across */
  const gridEvents = orders.flatMap((o) => o.events.map((e) => ({ e, o })))
  const slots = [...new Set(gridEvents.map(({ e }) => `${e.date} ${e.time}`))].sort((a, b) => (asc ? a.localeCompare(b) : b.localeCompare(a)))
  const pages = Math.max(1, Math.ceil(slots.length / GRID_PAGE))
  const page = Math.min(gridPage, pages - 1)
  const shownSlots = slots.slice(page * GRID_PAGE, page * GRID_PAGE + GRID_PAGE)
  const gridMeds = [...new Set(gridEvents.map(({ e, o }) => e.generic || o.med))]
  const cellFill = (st: string) => (st === 'ADMINISTERED' || st === 'WITNESSED' || st === 'SELF-ADMINISTERED' || st === 'OTHER PROVIDER' || st === 'DISPENSED'
    ? '#b3c795' : st === 'SCHEDULED' ? '#dbe9f7' : st === 'CANCELLED' || st === 'REFUSED' || st === 'WITHHELD' || st === 'OMITTED' ? '#d8d8d8' : undefined)
  const gridButton = (id: string, label: string, onClick: () => void) => (
    <PBButton style={{ minWidth: 30 }} data-tutorial-id={`host.mois.command.mar-grid-${id}`} onClick={onClick}>{label}</PBButton>
  )
  const grid = (
    <div className="pb-mar-list" data-tutorial-id="host.mois.group.mar-grid" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: '1 1 auto', overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `270px repeat(${GRID_PAGE}, 85px) 1fr`, background: 'linear-gradient(#f2f6fb, #fff)', minHeight: 36, alignItems: 'end' }}>
          <span />
          {Array.from({ length: GRID_PAGE }, (_, i) => {
            const s = shownSlots[i]
            return <span key={i} style={{ padding: '2px 4px', borderLeft: '1px dashed #d0d0d0', whiteSpace: 'pre-line' }}>{s ? s.replace(/\./g, '-').replace(' ', '\n') : ''}</span>
          })}
          <span />
        </div>
        {gridMeds.map((med) => (
          <div key={med} style={{ display: 'grid', gridTemplateColumns: `270px repeat(${GRID_PAGE}, 85px) 1fr`, background: '#f3c9c0', minHeight: 40, borderBottom: '1px solid #fff' }}
            data-tutorial-id={`host.mois.row.mar-grid-${pbSlug(med).slice(0, 40)}`}>
            <span style={{ padding: '6px 4px' }}>{med}</span>
            {Array.from({ length: GRID_PAGE }, (_, i) => {
              const slot = shownSlots[i]
              const hit = slot ? gridEvents.find(({ e, o }) => (e.generic || o.med) === med && `${e.date} ${e.time}` === slot) : undefined
              return (
                <span key={i}
                  data-tutorial-id={hit ? `host.mois.cell.mar-grid-${pbSlug(med).slice(0, 24)}-${pbSlug(hit.e.date)}` : undefined}
                  onMouseDown={() => hit && setSel({ order: hit.o.id, event: hit.e.id })}
                  onDoubleClick={() => hit && win.open(hit.e.status === 'SCHEDULED' ? MAR_ACTION_WINDOWS.scheduled : MAR_WINDOWS.detail, { event: hit.e.id })}
                  style={{ padding: '6px 4px', borderLeft: '1px dashed #fff', textAlign: hit ? 'left' : 'center', color: hit ? '#000' : '#8a8a8a', background: hit ? cellFill(hit.e.status) : undefined, outline: hit && sel?.event === hit.e.id ? '1px dotted #000' : undefined }}>
                  {hit ? hit.e.status : '-'}
                </span>
              )
            })}
            <span />
          </div>
        ))}
      </div>
      <div className="pb-row" style={{ flex: 'none', justifyContent: 'center', gap: 4, padding: '4px 0', background: 'var(--pb-face)', borderTop: '1px solid #c9c9c9' }}>
        {gridButton('first', '<<', () => setGridPage(0))}
        {gridButton('prev', '<', () => setGridPage(Math.max(0, page - 1)))}
        <span style={{ width: 360 }} />
        {gridButton('next', '>', () => setGridPage(Math.min(pages - 1, page + 1)))}
        {gridButton('last', '>>', () => setGridPage(pages - 1))}
      </div>
    </div>
  )

  const orderWin = selOrder ?? orderFor('running')
  /* the Drug Code Lookup keeps the window that raised it open underneath */
  const lookupParent = win.is(MAR_ACTION_WINDOWS.drugLookup) && typeof args.parent === 'string' ? args.parent : null
  const parentArgs = (lookupParent ? args.parentArgs : args) as Record<string, unknown> | undefined
  const shows = (id: string) => win.is(id) || lookupParent === id
  const lookupFrom = (parent: string) => () => win.open(MAR_ACTION_WINDOWS.drugLookup, { parent, parentArgs: win.window?.args ?? {} })
  const recordChoice = typeof parentArgs?.choice === 'number' ? parentArgs.choice : choice
  const closes = typeof parentArgs?.closes === 'string' ? findEvent(parentArgs.closes) : null
  const rescheduling = typeof parentArgs?.event === 'string' ? findEvent(parentArgs.event) : null
  const statusText = statuses.length ? statuses.join(', ') : ''

  return (
    <>
      <PBViewHeader title="Medication Administration Record" right={<ChartHeaderIdentity />} />
      <PBCommandRow
        commands={[
          { label: 'New …', onClick: startNew },
          { label: 'Open Parent Order', disabled: !selOrder || !ordering, onClick: openOrder },
          { label: 'Open Record', disabled: !selEvent, onClick: openRecord },
          { label: 'Refresh', onClick: () => setRecord('') },
        ]}
      />
      <PBIdentityStrip
        fields={[
          { label: 'FIRST:', value: patient.first },
          { label: 'MIDDLE:', value: patient.middle },
          { label: 'LAST:', value: patient.last },
          { label: 'DoB:', value: patient.dob },
        ]}
        encounter="NO ENCOUNTER"
      />
      <div className="pb-mar-filter" data-tutorial-id="host.mois.group.mar-filters">
        <span>Record Status:</span>
        <div className="pb-row" style={{ gap: 0 }}>
          <PBLookup w={480} placeholder="All…" name="mar-record-status" value={statusText} readOnly onDots={() => win.open(MAR_ACTION_WINDOWS.status)} />
        </div>
        <span>Search For:</span>
        <div className="pb-row">
          <PBInput w={266} placeholder="List for…" value={search} onChange={(e) => setSearch(e.target.value)} data-tutorial-id="host.mois.field.mar-search" />
          <span style={{ marginLeft: 20 }}>Record Limits:</span>
          <PBSelect w={108} value={limit} options={LIMITS} onChange={(e) => setLimit(e.target.value)} data-tutorial-id="host.mois.field.mar-record-limits" />
        </div>
      </div>
      <div className="pb-mar-viewband" data-tutorial-id="host.mois.group.mar-view">
        <button type="button" className="pb-link" onClick={expandAll} data-tutorial-id="host.mois.command.expand-all">Expand All</button>
        <button type="button" className="pb-link" onClick={collapseAll} data-tutorial-id="host.mois.command.collapse-all">Collapse All</button>
        <span className="pb-row__spacer" style={{ flex: '1 1 auto' }} />
        <span>View:</span>
        <PBSelect w={140} value={view} options={views} onChange={(e) => { setView(e.target.value); setGridPage(0) }} data-tutorial-id="host.mois.field.mar-view" />
        {view === 'Grid View' && (
          <span className="pb-row" style={{ gap: 10 }}>
            <PBRadio name="mar-grid-order" label="Asc" checked={asc} onChange={() => setAsc(true)} tutorialId="host.mois.field.mar-grid-asc" />
            <PBRadio name="mar-grid-order" label="Desc" checked={!asc} onChange={() => setAsc(false)} tutorialId="host.mois.field.mar-grid-desc" />
          </span>
        )}
      </div>

      {view === 'List View' ? list : view === 'Grid View' ? grid : grouped}

      {/* ---- the windows this list raises ---- */}
      {win.is(MAR_WINDOWS.chooser) && (
        <MarChooserWindow ordering={ordering} onClose={win.close} onContinue={continueChoice} />
      )}
      {shows(MAR_WINDOWS.record) && (
        <MarRecordWindow
          key={`record-${recordChoice}-${closes?.e.id ?? 'new'}`}
          kind={MAR_CHOICES[recordChoice]?.kind}
          action={MAR_CHOICES[recordChoice]?.action}
          prefill={closes ? { generic: closes.e.generic, dose: closes.e.dose, units: closes.e.units, orderBy: closes.o.orderBy } : undefined}
          picked={picked}
          onLookup={lookupFrom(MAR_WINDOWS.record)}
          onClose={win.close}
          onSave={(entry, close) => {
            if (closes) {
              /* the scheduled dose is closed off with what was recorded */
              changeEvent(closes.e.id, { ...entry, id: closes.e.id, date: MOIS_TODAY })
              setRecord(pbSlug(entry.status))
            } else {
              addOrder(oneDose(entry))
              setRecord('saved')
            }
            if (close) win.close()
          }}
        />
      )}
      {win.is(MAR_WINDOWS.detail) && detailTarget && (
        <MarRecordWindow
          key={detailTarget.e.id}
          event={detailTarget.e}
          order={detailTarget.o}
          onClose={win.close}
          onSave={() => win.close()}
          onDelete={() => win.open(MAR_WINDOWS.deleteRecord, { event: detailTarget.e.id })}
        />
      )}
      {win.is(MAR_WINDOWS.deleteRecord) && (
        <MarDeleteWindow
          onClose={() => win.open(MAR_WINDOWS.detail, { event: argEvent })}
          onContinue={() => {
            const id = argEvent ?? detailTarget?.e.id
            if (id) setSession((s) => ({ ...s, deleted: [...s.deleted, id] }))
            setSel(null)
            setRecord('deleted')
            win.close()
          }}
        />
      )}
      {win.is(MAR_WINDOWS.order) && orderWin && (
        <MarOrderWindow order={orderWin} cancelled={cancelled(orderWin)} onClose={win.close}
          onCancelOrder={() => win.open(MAR_WINDOWS.cancelOrder)} />
      )}
      {win.is(MAR_WINDOWS.cancelOrder) && orderWin && (
        <MarCancelOrderWindow order={orderWin} onClose={() => win.open(MAR_WINDOWS.order)}
          onCancelOrder={() => win.open(MAR_WINDOWS.cancelWarning)} />
      )}
      {win.is(MAR_WINDOWS.cancelWarning) && orderWin && (
        <MarCancelWarningBox
          onClose={() => win.open(MAR_WINDOWS.cancelOrder)}
          onYes={() => {
            setSession((s) => ({ ...s, cancelled: [...s.cancelled, orderWin.id] }))
            setOpen((o) => new Set(o).add(orderWin.id))
            setSel({ order: orderWin.id })
            setRecord('cancelled')
            win.close()
          }}
        />
      )}

      {/* ---- 303427's other windows (screens/MarActionWindows.tsx) ---- */}
      {shows(MAR_ACTION_WINDOWS.newOrder) && (
        <MarNewOrderWindow
          picked={picked}
          onLookup={lookupFrom(MAR_ACTION_WINDOWS.newOrder)}
          onClose={win.close}
          onSubmit={(d: MarOrderDraft, signed) => {
            const n = doseCount(d)
            const perDay = /^BID/.test(d.frequency) ? 2 : /^TID/.test(d.frequency) ? 3 : /^QID/.test(d.frequency) ? 4 : 1
            const weekly = /^QW/.test(d.frequency)
            const times = ['09:00', '13:00', '17:00', '21:00']
            const med = d.med || '(no medication)'
            const events: MarEvent[] = Array.from({ length: n }, (_, k) => ({
              id: newId('stage-event'),
              /* Save Order leaves every dose NOT SCHEDULED until it is signed */
              status: signed ? 'SCHEDULED' : 'NOT SCHEDULED',
              date: addDays(d.start || MOIS_TODAY, weekly ? k * 7 : Math.floor(k / perDay)),
              time: perDay > 1 ? times[k % perDay]! : d.startTime || '09:00',
              med, generic: med, dose: d.dosage, units: d.dosageUnit, series: d.series, site: d.site, lot: '', by: '',
            })).reverse()
            addOrder({
              id: newId('stage-order'), orderDate: MOIS_TODAY, orderTime: stamp(), med, orderBy: 'TECHNICAL SUPPORT',
              detail: `${[d.dosage, d.dosageUnit, d.frequency.split(' ')[0]].filter(Boolean).join(' ')}   for ${d.duration || n} ${(d.durationUnit || 'DOSE').split(' ')[0]}`,
              dosage: d.dosage, dosageUnit: d.dosageUnit, frequency: d.frequency, duration: d.duration || String(n), durationUnit: d.durationUnit || 'DOSE',
              route: d.route, signed: signed ? { action: 'SIGNED', note: '', on: `${MOIS_TODAY} ${stamp()} - TECHNICAL SUPPORT` } : { action: '', note: '', on: '' },
              created: `${MOIS_TODAY}  ${stamp()}  TECHNICAL SUPPORT`, modified: '', events,
            })
            setRecord(signed ? 'order-signed' : 'order-saved')
            win.close()
          }}
        />
      )}
      {shows(MAR_ACTION_WINDOWS.reschedule) && (
        <MarRescheduleWindow
          key={`reschedule-${rescheduling?.e.id ?? 'new'}`}
          event={rescheduling?.e}
          order={rescheduling?.o}
          picked={picked}
          onLookup={lookupFrom(MAR_ACTION_WINDOWS.reschedule)}
          onClose={win.close}
          onSave={(d) => {
            if (rescheduling) {
              /* closes the loop on the scheduled dose, and books its replacement */
              const { e, o } = rescheduling
              changeEvent(e.id, { status: 'RESCHEDULED' })
              if (d.date) {
                setSession((s) => ({
                  ...s,
                  extra: { ...(s.extra ?? {}), [o.id]: [{ ...e, id: newId('stage-event'), status: 'SCHEDULED', date: d.date, time: d.time || e.time }, ...(s.extra?.[o.id] ?? [])] },
                }))
              }
            } else {
              /* from New …: "will create a new record (which was not scheduled
                 before) and will not close the loop" */
              addOrder(oneDose(blankEvent('RESCHEDULED', d.med, { dose: d.dose, units: d.units })))
            }
            setRecord('rescheduled')
            win.close()
          }}
        />
      )}
      {shows(MAR_ACTION_WINDOWS.notGiven) && (
        <MarNotGivenWindow
          key={`not-given-${rescheduling?.e.id ?? 'new'}`}
          event={rescheduling?.e}
          order={rescheduling?.o}
          picked={picked}
          onLookup={lookupFrom(MAR_ACTION_WINDOWS.notGiven)}
          onClose={win.close}
          onSave={(d) => {
            if (rescheduling) changeEvent(rescheduling.e.id, { status: d.action, date: MOIS_TODAY, time: stamp() })
            else addOrder(oneDose(blankEvent(d.action, d.med)))
            setRecord(pbSlug(d.action))
            win.close()
          }}
        />
      )}
      {win.is(MAR_ACTION_WINDOWS.scheduled) && scheduledTarget && (
        <MarScheduledRecordWindow
          key={scheduledTarget.e.id}
          order={scheduledTarget.o}
          event={scheduledTarget.e}
          onAction={(a) => doseAction(a, scheduledTarget.e.id)}
          onClose={win.close}
        />
      )}
      {win.is(MAR_ACTION_WINDOWS.drugLookup) && (
        <MarDrugCodeLookupWindow
          onClose={() => (lookupParent ? win.open(lookupParent, parentArgs) : win.close())}
          onPick={(drug) => {
            setPicked((p) => ({ name: marDrugName(drug), seq: (p?.seq ?? 0) + 1 }))
            if (lookupParent) win.open(lookupParent, parentArgs)
            else win.close()
          }}
        />
      )}
      {win.is(MAR_ACTION_WINDOWS.status) && (
        <MarStatusSelectionWindow selected={statuses} onClose={win.close} onOk={(codes) => { setStatuses(codes); win.close() }} />
      )}
      {win.is(MAR_ACTION_WINDOWS.requireEncounter) && (
        <StageMessageBox id={MAR_ACTION_WINDOWS.requireEncounter} title="MAR Require Encounter" icon="error"
          buttons={[{ label: 'OK', value: 'ok', default: true }]} onClose={win.close}>
          A MAR record must be linked to an encounter.<br />Select an Active Encounter (Active ENC# …) before creating a new MAR record.
        </StageMessageBox>
      )}
    </>
  )
}
