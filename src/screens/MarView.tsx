import { Fragment, useMemo, useState } from 'react'
import { useChartExport } from '../data/chart-records'
import { marOrdersFromExport, practiceOrder, type MarEvent, type MarOrder } from '../data/marOrders'
import { ChartHeaderIdentity, usePatient } from '../data/patient-context'
import { MOIS_TODAY } from '../data/patients'
import { useScreenReport } from '../host/screen-state'
import { useScreenWindow, useSessionState } from '../host/screen-windows'
import {
  PBCommandRow, PBDataWindow, PBIdentityStrip, PBInput, PBLookup, PBSelect, PBViewHeader, pbSlug,
  type PBMenuItem,
} from '../pb'
import {
  MAR_CHOICES, MAR_WINDOWS, MarCancelOrderWindow, MarCancelWarningBox, MarChooserWindow,
  MarDeleteWindow, MarOrderWindow, MarRecordWindow,
} from './MarWindows'
import { contextPoint, RowContextMenu, type ContextMenuAt } from './RowContextMenu'
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
   ========================================================================= */

type Sel = { order: string; event?: string }
type MarSession = { added: MarOrder[]; deleted: string[]; cancelled: string[] }
const VIEWS = ['List View', 'Group by Medication', 'Group by Parent Order']

export function MarView() {
  const data = useChartExport()
  const patient = usePatient()
  const win = useScreenWindow()
  const [session, setSession] = useSessionState<MarSession>(`mar:${patient.chart}`, { added: [], deleted: [], cancelled: [] })
  const [view, setView] = useState('Group by Parent Order')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [sel, setSel] = useState<Sel | null>(null)
  const [menuAt, setMenuAt] = useState<ContextMenuAt>(null)
  const [record, setRecord] = useState('')
  const [choice, setChoice] = useState(0)

  /* the export's orders, the stage's running order, and what was added here;
     a cancelled order and its doses read CANCELLED */
  const orders = useMemo<MarOrder[]>(() => {
    const all = [...session.added, practiceOrder(), ...marOrdersFromExport(data)]
    return all
      .map((o) => ({ ...o, events: o.events.filter((e) => !session.deleted.includes(e.id)) }))
      .filter((o) => o.events.length > 0 || session.cancelled.includes(o.id))
      .map((o) => (session.cancelled.includes(o.id)
        ? { ...o, events: o.events.map((e) => (e.status === 'SCHEDULED' ? { ...e, status: 'CANCELLED' } : e)) }
        : o))
      .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
  }, [data, session])

  const cancelled = (o: MarOrder) => session.cancelled.includes(o.id)
  const selOrder = orders.find((o) => o.id === sel?.order)
  const selEvent = selOrder?.events.find((e) => e.id === sel?.event)
  const argEvent = typeof win.window?.args?.event === 'string' ? win.window.args.event : undefined
  /* a window opened by name (a lesson's openUtility) with no row picked acts
     on the first order that has what it needs */
  const orderFor = (need: 'running' | 'administered') => selOrder ?? orders.find((o) => (need === 'running'
    ? o.events.some((e) => e.status === 'SCHEDULED') : o.events.some((e) => e.status === 'ADMINISTERED')))
  const detailTarget = (() => {
    if (argEvent) {
      for (const o of orders) { const e = o.events.find((x) => x.id === argEvent); if (e) return { o, e } }
    }
    if (selEvent && selOrder) return { o: selOrder, e: selEvent }
    const o = orderFor('administered')
    const e = o?.events.find((x) => x.status === 'ADMINISTERED')
    if (o && e) return { o, e }
    /* no administered dose listed yet (the export still loading): the first dose */
    const first = orders.find((x) => x.events.length)
    return first ? { o: first, e: first.events[0]! } : null
  })()

  /* `row` is the selected line's anchor slug, which host.mois.selectRow grades */
  const selRow = !selOrder ? '' : selEvent ? `mar-${pbSlug(selEvent.status)}-${pbSlug(selEvent.date)}` : `mar-order-${pbSlug(selOrder.med).slice(0, 40)}`
  useScreenReport({ record, rows: orders.length, draft: false, row: selRow })

  const openOrder = () => { if (selOrder ?? orderFor('running')) win.open(MAR_WINDOWS.order) }
  const openRecord = () => { if (selEvent) win.open(MAR_WINDOWS.detail, { event: selEvent.id }) }
  const expandAll = () => setOpen(new Set(orders.map((o) => o.id)))
  const collapseAll = () => setOpen(new Set())

  const menu: PBMenuItem[] = [
    { label: 'New …', onSelect: () => win.open(MAR_WINDOWS.chooser) },
    { label: 'Open Parent Order', disabled: !selOrder, onSelect: openOrder },
    { label: 'Refresh' },
    { sep: true },
    { label: 'Expand All', onSelect: expandAll },
    { label: 'Collapse All', onSelect: collapseAll },
  ]

  const status = (e: MarEvent, o: MarOrder) => (cancelled(o) ? 'pb-mar-struck'
    : e.status === 'SCHEDULED' ? (e.date < MOIS_TODAY ? 'pb-mar-event--overdue' : 'pb-mar-event--scheduled') : '')
  const admin = (o: MarOrder) => o.events.filter((e) => e.status !== 'SCHEDULED' && e.status !== 'CANCELLED').length

  /* the grouped views: one band per order (or per medication) and its events */
  const groups = view === 'Group by Medication'
    ? [...new Set(orders.map((o) => o.med))].map((med) => ({ key: `med:${med}`, orders: orders.filter((o) => o.med === med) }))
    : orders.map((o) => ({ key: o.id, orders: [o] }))

  const grouped = (
    <div className="pb-mar-list" data-tutorial-id="host.mois.group.mar-list"
      onContextMenu={(e) => setMenuAt(contextPoint(e))}>
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
                onDoubleClick={() => { setSel({ order: x.id, event: e.id }); win.open(MAR_WINDOWS.detail, { event: e.id }) }}
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
      onContextMenu={(e) => setMenuAt(contextPoint(e))}>
      <PBDataWindow
        rows={listRows}
        current={Math.max(0, listRows.findIndex((r) => r.id === sel?.event))}
        onCurrentChange={(i) => setSel({ order: listRows[i]!.order, event: listRows[i]!.id })}
        onActivate={(r) => win.open(MAR_WINDOWS.detail, { event: r.id })}
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

  const orderWin = selOrder ?? orderFor('running')

  return (
    <>
      <PBViewHeader title="Medication Administration Record" right={<ChartHeaderIdentity />} />
      <PBCommandRow
        commands={[
          { label: 'New …', onClick: () => win.open(MAR_WINDOWS.chooser) },
          { label: 'Open Parent Order', disabled: !selOrder, onClick: openOrder },
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
        <div className="pb-row" style={{ gap: 0 }}><PBLookup w={480} placeholder="All…" /></div>
        <span>Search For:</span>
        <div className="pb-row">
          <PBInput w={266} placeholder="List for…" />
          <span style={{ marginLeft: 20 }}>Record Limits:</span>
          <PBSelect w={108} options={['All Records', 'Last 10', 'Last 20']} />
        </div>
      </div>
      <div className="pb-mar-viewband" data-tutorial-id="host.mois.group.mar-view">
        <button type="button" className="pb-link" onClick={expandAll} data-tutorial-id="host.mois.command.expand-all">Expand All</button>
        <button type="button" className="pb-link" onClick={collapseAll} data-tutorial-id="host.mois.command.collapse-all">Collapse All</button>
        <span className="pb-row__spacer" style={{ flex: '1 1 auto' }} />
        <span>View:</span>
        <PBSelect w={140} value={view} options={VIEWS} onChange={(e) => setView(e.target.value)} data-tutorial-id="host.mois.field.mar-view" />
      </div>

      {view === 'List View' ? list : grouped}

      {/* ---- the windows this list raises ---- */}
      {win.is(MAR_WINDOWS.chooser) && (
        <MarChooserWindow
          onClose={win.close}
          onContinue={(i) => { setChoice(i); win.open(MAR_WINDOWS.record, { choice: i }) }}
        />
      )}
      {win.is(MAR_WINDOWS.record) && (
        <MarRecordWindow
          action={MAR_CHOICES[typeof win.window?.args?.choice === 'number' ? win.window.args.choice : choice]?.action}
          onClose={win.close}
          onSave={(entry, close) => {
            const order: MarOrder = {
              id: `stage-order-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              orderDate: MOIS_TODAY, orderTime: entry.time, med: entry.generic || '(no medication)', orderBy: 'TECHNICAL SUPPORT',
              detail: `${[entry.dose, entry.units].filter(Boolean).join(' ')}   for 1 DOSE`, dosage: entry.dose, dosageUnit: entry.units,
              frequency: '', duration: '1', durationUnit: 'DOSE', route: '', signed: { action: 'SIGNED', note: '', on: `${MOIS_TODAY} - TECHNICAL SUPPORT` },
              created: `${MOIS_TODAY}  TECHNICAL SUPPORT`, modified: '', events: [{ ...entry, id: `stage-event-${Date.now()}` }],
            }
            setSession((s) => ({ ...s, added: [order, ...s.added] }))
            setRecord('saved')
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
    </>
  )
}
