import { useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { PBButton, PBCheckbox, PBInput, PBRadio, PBSelect, PBViewHeader } from '../pb'
import { RESOURCES, VISIT_CODE_FILL, weekdayOf } from '../data/daybook'
import { daybookProviders } from '../data/mois'
import { DESKTOP_PROVIDER_DEFAULT, SESSION_LOGIN } from '../data/session'
import {
  dayRows, resourceRows, schedulerStore, stampOf, useSchedulerStore, type DayRow,
} from '../data/schedulerStore'
import { useOpenWindow } from './areaWindowRegistry'

/* ============================================================================
   The view-only schedules: Week View - 1 Provider / Resource and Day View -
   1, 3 or 8 Providers / Resources.

   Transcribed from art. 303795 — `48fd65a6…` and `ca84aa4e…` (the week:
   "Seven Day Schedule For : <provider>" with Current User on the right, seven
   day columns starting on the chosen date, a provider drop-down in the tool
   strip, reservation blocks such as ROUNDS painted across the day),
   `05a19a26…` (Day View - 3: "Day View: <date>", one drop-down per column,
   `<No Selection>` in an unused one, appointments as a box with the visit
   code's bar down its left edge and name / reason / code inside) and
   `66547599…` (Day View - 8: the boxes filled in the visit code's colour and
   carrying no text — the detail is an Administration setting). The tool strip
   in all of them: Today, Refresh, << < date > >>, Hide: No-Show / Rebooked /
   Cancelled, and 4 hr / 8 hr, which sets how many hours fill the window.

   There is no New Appt, Save or Delete here: "The Day Book is the only
   screen that allows you to create, edit, or delete appointments. The Day
   view and Week view screens are View Only" (art. 303795). Right-clicking an
   appointment gives the menu in art. 3075361 `b45a7ee6…`, whose Edit
   Appointment opens Appointment Detail for the timestamps.
   ========================================================================= */

/* The grid, from the 2026-10-02 TRAINING Seven Day Schedule captures
   (Desktop 11.44.39 / 11.44.45 / 11.44.56 PM, ≈1.13× CSS px):
   - the whole day, 0:00 to 24:00, opening scrolled to 8:00 — the right-hand
     scroll bar's thumb sits a third of the way down a 24-hour track;
   - 72 px an hour on 8 hr (eight hours fill the window), banded every five
     minutes white / #f5f5f5, the hour ruled #a4a4a4, :30 #acacac, :15 and
     :45 dashed #cacaca; a 35 px time axis with the hour bold;
   - day columns 4 px of navy (#000b80) apart, each its own DataWindow with a
     horizontal scroll bar at its foot that pans that day alone (the three
     captures pan Thursday only), the shared vertical bar at the right;
   - the clicked day's caption box framed in navy, heavier along its foot;
   - an appointment a white box with a black rule and the visit code's strip
     down its left edge, "ADAMS, / JOSEPH" over two lines, and one that
     overlaps an earlier booking set beside it rather than over it.
   INFERRED: how far a day pans (four column widths, from the thumb's size)
   and that no day is framed until one is clicked. */
const START = 0
const END = 24
const OPEN_AT = 8
const NAVY = '#000b80'
const AXIS_W = 35
const DAYGRID_CSS = `
.sch-daygrid__col { overflow-x: scroll; overflow-y: hidden; }
.sch-daygrid__vbar { overflow-x: hidden; overflow-y: scroll; }
`
const LONG = new Intl.DateTimeFormat('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const dateOf = (off: number) => {
  const [y, m, d] = stampOf(off).split('.').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d))
}

/* Administration's Reservation Block Code colours (adminLists.ts, 303081) */
const BLOCK_FILL: Record<string, string> = {
  CLOSED: 'rgb(255,255,192)', LUNCH: 'rgb(155,155,155)', DEVELOPMENT: 'rgb(232,232,255)',
  'GROUP VISIT': 'rgb(192,255,192)', MEETINGS: 'rgb(192,232,255)', 'OUT-OF-OFFICE': 'rgb(192,192,192)',
  ROUNDS: 'rgb(255,192,192)', HOLIDAY: 'rgb(255,0,0)', TEST: 'rgb(56,156,56)',
}

export function DayGridView({
  columns, mode = 'day', title,
}: {
  /** how many provider/resource columns to draw */
  columns: number
  mode?: 'day' | 'week'
  title: string
}) {
  const s = useSchedulerStore()
  const openWindow = useOpenWindow()
  const resource = title.includes('Resource')
  const [offset, setOffset] = useState(() => s.current?.offset ?? 0)
  const [span, setSpan] = useState<'4' | '8'>(mode === 'week' ? '8' : '4')
  const [hide, setHide] = useState({ noshow: true, rebooked: true, cancelled: true })
  const owners = resource ? RESOURCES : daybookProviders.map((p) => p.provider)
  const first = resource ? '1' : s.current?.provider ?? DESKTOP_PROVIDER_DEFAULT
  const [picked, setPicked] = useState<string[]>(() => {
    const list = [first, ...owners.filter((o) => o !== first && (resource || dayRows(s, o, offset).length))]
    while (list.length < columns) list.push('')
    return list.slice(0, columns)
  })
  const [weekOwner, setWeekOwner] = useState(first)

  /* 4 hr fills the window with four hours, 8 hr with eight */
  const quarter = span === '4' ? 40 : 18
  const hourPx = quarter * 4
  const band = hourPx / 12
  const total = (END - START) * hourPx
  const [selected, setSelected] = useState<number | null>(null)

  const cols = mode === 'week'
    ? Array.from({ length: 7 }, (_, i) => ({ owner: weekOwner, offset: offset + i }))
    : picked.map((owner) => ({ owner, offset }))

  const rowsOf = (owner: string, off: number): DayRow[] => {
    if (!owner) return []
    const rows = resource ? resourceRows(owner, off) : dayRows(s, owner, off)
    return rows.filter((r) => !((r.as === 'N' && hide.noshow) || (r.as === 'R' && hide.rebooked) || (r.as === 'C' && hide.cancelled)))
  }

  const move = (d: number | 'today') => setOffset((o) => (d === 'today' ? 0 : o + d))

  const onAppt = (e: ReactMouseEvent, owner: string, off: number, row: DayRow) => {
    e.preventDefault()
    if (resource) return
    schedulerStore.setCurrent(owner, off, row.key)
    openWindow('dayview-appt-menu', { x: e.clientX, y: e.clientY })
  }

  /* one vertical bar drives the axis and every column (each column keeps its
     own horizontal bar); the wheel anywhere on the grid scrolls it */
  const vbarRef = useRef<HTMLDivElement>(null)
  const paneRefs = useRef<(HTMLDivElement | null)[]>([])
  const syncY = () => {
    const y = vbarRef.current?.scrollTop ?? 0
    for (const el of paneRefs.current) if (el) el.scrollTop = y
  }
  const hourAt = useRef(OPEN_AT)
  useLayoutEffect(() => {
    const bar = vbarRef.current
    if (!bar) return
    bar.scrollTop = (hourAt.current - START) * hourPx
    syncY()
  }, [hourPx, cols.length])
  const onScrollY = () => {
    syncY()
    hourAt.current = START + (vbarRef.current?.scrollTop ?? 0) / hourPx
  }

  const detail = mode === 'week' || columns <= 3
  const head = mode === 'week'
    ? `Seven Day Schedule For : ${weekOwner}`
    : `Day View: ${LONG.format(dateOf(offset)).replace(', ', ' ')}`
  const boxW = mode === 'week' ? '80px' : '11%'

  /* the five-minute bands, painted once per canvas; the rules are spans */
  const bands = `repeating-linear-gradient(to bottom, #fff 0 ${band}px, #f5f5f5 ${band}px ${band * 2}px)`
  const RULES = ['1px solid #a4a4a4', '1px dashed #cacaca', '1px solid #acacac', '1px dashed #cacaca']

  return (
    <>
      <PBViewHeader title={head} right={<span className="pb-viewhead__chart">{mode === 'week' ? `Current User: ${SESSION_LOGIN}` : SESSION_LOGIN}</span>} />
      <style>{DAYGRID_CSS}</style>
      <div className="pb-row" style={{ gap: 4, padding: '3px 6px', borderBottom: '1px solid #c9c9c9', flex: 'none', background: 'var(--pb-face)' }}>
        <PBButton style={{ minWidth: 60 }} onClick={() => move('today')}>Today</PBButton>
        <PBButton style={{ minWidth: 60 }}>Refresh</PBButton>
        <PBButton size="sm" style={{ width: 24 }} onClick={() => move(-7)}>&lt;&lt;</PBButton>
        <PBButton size="sm" style={{ width: 24 }} onClick={() => move(-1)}>&lt;</PBButton>
        <PBInput w={88} align="center" value={stampOf(offset)} readOnly style={{ background: '#fff' }} />
        <PBButton size="sm" style={{ width: 24 }} onClick={() => move(1)}>&gt;</PBButton>
        <PBButton size="sm" style={{ width: 24 }} onClick={() => move(7)}>&gt;&gt;</PBButton>
        {mode === 'week' && (
          <PBSelect w={158} options={owners} value={weekOwner} onChange={(e) => setWeekOwner(e.target.value)} />
        )}
        <span style={{ marginLeft: 16 }}>Hide:</span>
        <PBCheckbox label="No-Show" checked={hide.noshow} onChange={(v) => setHide({ ...hide, noshow: v })} />
        <PBCheckbox label="Rebooked" checked={hide.rebooked} onChange={(v) => setHide({ ...hide, rebooked: v })} />
        <PBCheckbox label="Cancelled" checked={hide.cancelled} onChange={(v) => setHide({ ...hide, cancelled: v })} />
        <span className="pb-row__spacer" />
        <PBRadio name={`span-${title}`} label="4 hr" checked={span === '4'} onChange={() => setSpan('4')} />
        <PBRadio name={`span-${title}`} label="8 hr" checked={span === '8'} onChange={() => setSpan('8')} />
      </div>

      <div
        style={{ flex: '1 1 auto', minHeight: 0, background: '#fff', display: 'flex', flexDirection: 'column' }}
        data-tutorial-id="host.mois.field.day-grid"
        onWheel={(e) => { if (vbarRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) vbarRef.current.scrollTop += e.deltaY }}
      >
        {/* the column heads: a drop-down per provider, or the weekday */}
        <div style={{ display: 'flex', flex: 'none', background: '#fff', paddingRight: 17 }}>
          <span style={{ width: AXIS_W, flex: 'none' }} />
          {cols.map((c, i) => (
            <span key={i} style={{ flex: '1 1 0', minWidth: 90, padding: '2px 4px 3px', borderLeft: `4px solid ${NAVY}` }} onClick={() => setSelected(i)}>
              {mode === 'week' ? (
                <span
                  data-tutorial-id={`host.mois.field.week-day-${i}`}
                  style={{
                    display: 'block', textAlign: 'center', lineHeight: '16px', background: '#fff',
                    border: selected === i ? `2px solid ${NAVY}` : '1px solid #8c8c8c',
                    borderBottomWidth: selected === i ? 4 : 1,
                    margin: selected === i ? '0 -1px' : undefined,
                  }}
                >
                  {`${WD[weekdayOf(c.offset)]} ${String(dateOf(c.offset).getUTCDate()).padStart(2, '0')}`}
                </span>
              ) : (
                <PBSelect
                  w="100%"
                  value={c.owner}
                  options={[{ value: '', label: '<No Selection>' }, ...owners]}
                  onChange={(e) => setPicked(picked.map((p, j) => (j === i ? e.target.value : p)))}
                />
              )}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', flex: '1 1 auto', minHeight: 0 }}>
          {/* the time axis: bold hours, then :15 :30 :45 */}
          <div ref={(el) => { paneRefs.current[cols.length] = el }} style={{ width: AXIS_W, flex: 'none', overflow: 'hidden' }}>
            <div style={{ height: total, position: 'relative' }}>
              {Array.from({ length: (END - START) * 4 }, (_, q) => {
                const h = START + Math.floor(q / 4)
                const m = (q % 4) * 15
                return (
                  <div key={q} style={{ height: quarter, borderTop: m === 0 ? '2px solid #3c3c3c' : undefined, boxSizing: 'border-box', textAlign: 'right', paddingRight: 3, fontSize: 11, fontWeight: m === 0 ? 700 : 400, lineHeight: '15px' }}>
                    {m === 0 ? `${h}:00` : (span === '4' || m === 30) ? `:${m}` : ''}
                  </div>
                )
              })}
            </div>
          </div>
          {cols.map((c, i) => {
            const rows = rowsOf(c.owner, c.offset)
            const blocks = resource ? (s.resourceBlocks[c.owner] ?? []) : (s.blocks[c.owner] ?? [])
            const today = blocks.filter((b) => b.date === stampOf(c.offset))
            /* side by side, not over: each booking takes the first lane free at its start */
            const lanes: number[] = []
            const laneOf = new Map<string, number>()
            for (const r of [...rows].sort((x, y) => `${x.hr}${x.mn}`.localeCompare(`${y.hr}${y.mn}`))) {
              const from = Number(r.hr) * 60 + Number(r.mn)
              const to = from + (Number(r.n) || 3) * 5
              let lane = lanes.findIndex((end) => end <= from)
              if (lane < 0) { lane = lanes.length; lanes.push(to) } else lanes[lane] = to
              laneOf.set(r.key, lane)
            }
            return (
              <div
                key={i}
                ref={(el) => { paneRefs.current[i] = el }}
                className="sch-daygrid__col"
                onMouseDown={() => setSelected(i)}
                style={{ flex: '1 1 0', minWidth: 90, borderLeft: `4px solid ${NAVY}` }}
              >
                <div style={{ position: 'relative', width: '400%', height: total, background: bands }}>
                  {Array.from({ length: (END - START) * 4 }, (_, q) => (
                    <span key={q} style={{ position: 'absolute', left: 0, right: 0, top: q * quarter, borderTop: RULES[q % 4] }} />
                  ))}
                  {today.map((b) => {
                    const top = ((Number(b.hr) - START) * 60 + Number(b.min)) / 15 * quarter
                    const height = Math.min(total - Math.max(0, top), (Number(b.n) * 5) / 15 * quarter)
                    return (
                      <div key={b.id} title={`${b.code} ${b.note}`} style={{ position: 'absolute', left: 0, width: '25%', top: Math.max(0, top), height, background: BLOCK_FILL[b.code] ?? '#ddd', opacity: 0.9, fontSize: 10, fontWeight: 700, padding: '1px 3px', boxSizing: 'border-box' }}>
                        {b.code}
                      </div>
                    )
                  })}
                  {rows.map((r) => {
                    const top = ((Number(r.hr) - START) * 60 + Number(r.mn)) / 15 * quarter
                    const height = Math.max(quarter - 2, ((Number(r.n) || 3) * 5) / 15 * quarter - 2)
                    if (top < 0) return null
                    const fill = VISIT_CODE_FILL[r.code] ?? '#b1d8d8'
                    const lane = laneOf.get(r.key) ?? 0
                    return (
                      <div
                        key={r.key}
                        data-tutorial-id={`host.mois.cell.dayview-${r.hr}${r.mn}`}
                        title={`${r.last}, ${r.first} — ${r.reason} (${r.code})`}
                        onContextMenu={(e) => onAppt(e, c.owner, c.offset, r)}
                        style={{
                          position: 'absolute', left: `calc(3px + ${lane} * (${boxW} + 3px))`, width: boxW, minWidth: 80, top: top + 1, height,
                          boxSizing: 'border-box', border: '1px solid #000', background: detail ? '#fff' : fill,
                          borderLeft: `5px solid ${fill}`, boxShadow: 'inset 1px 0 0 #000', fontSize: 10, lineHeight: '12px', padding: '1px 3px', overflow: 'hidden',
                          cursor: 'default', zIndex: 1,
                        }}
                      >
                        {detail && (mode === 'week'
                          ? <>{r.last},<br />{r.first}</>
                          : <>{r.last}, {r.first}<br />{r.reason.toUpperCase()}<br />{r.code}</>)}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          <div ref={vbarRef} className="sch-daygrid__vbar" style={{ width: 17, flex: 'none' }} onScroll={onScrollY}>
            <div style={{ height: total + 17 }} />
          </div>
        </div>
      </div>
    </>
  )
}
