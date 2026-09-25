import { useState, type MouseEvent as ReactMouseEvent } from 'react'
import { PBButton, PBCheckbox, PBInput, PBRadio, PBSelect, PBViewHeader } from '../pb'
import { RESOURCES, VISIT_CODE_FILL, weekdayOf } from '../data/daybook'
import { daybookProviders } from '../data/mois'
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

const START = 8
const END = 18
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
  const first = resource ? '1' : s.current?.provider ?? 'TECHNICAL SUPPORT'
  const [picked, setPicked] = useState<string[]>(() => {
    const list = [first, ...owners.filter((o) => o !== first && (resource || dayRows(s, o, offset).length))]
    while (list.length < columns) list.push('')
    return list.slice(0, columns)
  })
  const [weekOwner, setWeekOwner] = useState(first)

  /* 4 hr fills the window with four hours, 8 hr with eight */
  const quarter = span === '4' ? 40 : 18
  const quarters = (END - START) * 4

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

  const detail = mode === 'week' || columns <= 3
  const head = mode === 'week'
    ? `Seven Day Schedule For : ${weekOwner}`
    : `Day View: ${LONG.format(dateOf(offset)).replace(', ', ' ')}`

  return (
    <>
      <PBViewHeader title={head} right={mode === 'week' ? 'Current User: JALA2' : 'JALA2'} />
      <div className="pb-row" style={{ gap: 4, padding: '3px 6px', borderBottom: '1px solid #c9c9c9', flex: 'none', background: 'var(--pb-face)' }}>
        <PBButton style={{ minWidth: 60 }} onClick={() => move('today')}>Today</PBButton>
        <PBButton style={{ minWidth: 60 }}>Refresh</PBButton>
        <PBButton size="sm" style={{ width: 24 }} onClick={() => move(-7)}>&lt;&lt;</PBButton>
        <PBButton size="sm" style={{ width: 24 }} onClick={() => move(-1)}>&lt;</PBButton>
        <PBInput w={100} align="center" value={stampOf(offset)} readOnly style={{ background: '#fff' }} />
        <PBButton size="sm" style={{ width: 24 }} onClick={() => move(1)}>&gt;</PBButton>
        <PBButton size="sm" style={{ width: 24 }} onClick={() => move(7)}>&gt;&gt;</PBButton>
        {mode === 'week' && (
          <PBSelect w={190} options={owners} value={weekOwner} onChange={(e) => setWeekOwner(e.target.value)} />
        )}
        <span style={{ marginLeft: 16 }}>Hide:</span>
        <PBCheckbox label="No-Show" checked={hide.noshow} onChange={(v) => setHide({ ...hide, noshow: v })} />
        <PBCheckbox label="Rebooked" checked={hide.rebooked} onChange={(v) => setHide({ ...hide, rebooked: v })} />
        <PBCheckbox label="Cancelled" checked={hide.cancelled} onChange={(v) => setHide({ ...hide, cancelled: v })} />
        <span className="pb-row__spacer" />
        <PBRadio name={`span-${title}`} label="4 hr" checked={span === '4'} onChange={() => setSpan('4')} />
        <PBRadio name={`span-${title}`} label="8 hr" checked={span === '8'} onChange={() => setSpan('8')} />
      </div>

      <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', background: '#fff', display: 'flex', flexDirection: 'column' }} data-tutorial-id="host.mois.field.day-grid">
        {/* the column heads: a drop-down per provider, or the weekday */}
        <div style={{ display: 'flex', flex: 'none', position: 'sticky', top: 0, zIndex: 2, background: '#fff' }}>
          <span style={{ width: 46, flex: 'none' }} />
          {cols.map((c, i) => (
            <span key={i} style={{ flex: '1 1 0', minWidth: 90, padding: '2px 4px', borderLeft: '3px solid #00007a' }}>
              {mode === 'week' ? (
                <span style={{ display: 'block', border: '1px solid #8c8c8c', textAlign: 'center' }}>
                  {`${WD[weekdayOf(c.offset)]} ${dateOf(c.offset).getUTCDate()}`}
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
        <div style={{ display: 'flex', position: 'relative' }}>
          {/* the time axis: bold hours, then :15 :30 :45 */}
          <div style={{ width: 46, flex: 'none' }}>
            {Array.from({ length: quarters }, (_, q) => {
              const h = START + Math.floor(q / 4)
              const m = (q % 4) * 15
              return (
                <div key={q} style={{ height: quarter, borderTop: m === 0 ? '1px solid #8c8c8c' : undefined, textAlign: 'right', paddingRight: 4, fontSize: 11, fontWeight: m === 0 ? 700 : 400 }}>
                  {m === 0 ? `${h}:00` : (span === '4' || m === 30) ? `:${m}` : ''}
                </div>
              )
            })}
          </div>
          {cols.map((c, i) => {
            const rows = rowsOf(c.owner, c.offset)
            const blocks = resource ? (s.resourceBlocks[c.owner] ?? []) : (s.blocks[c.owner] ?? [])
            const today = blocks.filter((b) => b.date === stampOf(c.offset))
            return (
              <div key={i} style={{ flex: '1 1 0', minWidth: 90, position: 'relative', borderLeft: '3px solid #00007a' }}>
                {Array.from({ length: quarters }, (_, q) => (
                  <div
                    key={q}
                    style={{
                      height: quarter,
                      borderTop: q % 4 === 0 ? '1px solid #8c8c8c' : q % 2 === 0 ? '1px dashed #c8c8c8' : '1px dashed #e4e4e4',
                      background: q % 2 ? '#f5f5f5' : '#fff',
                    }}
                  />
                ))}
                {today.map((b) => {
                  const top = ((Number(b.hr) - START) * 60 + Number(b.min)) / 15 * quarter
                  const height = Math.min(quarters * quarter - Math.max(0, top), (Number(b.n) * 5) / 15 * quarter)
                  return (
                    <div key={b.id} title={`${b.code} ${b.note}`} style={{ position: 'absolute', left: 0, right: 0, top: Math.max(0, top), height, background: BLOCK_FILL[b.code] ?? '#ddd', opacity: 0.9, fontSize: 10, fontWeight: 700, padding: '1px 3px' }}>
                      {b.code}
                    </div>
                  )
                })}
                {rows.map((r) => {
                  const top = ((Number(r.hr) - START) * 60 + Number(r.mn)) / 15 * quarter
                  const height = Math.max(quarter - 2, ((Number(r.n) || 3) * 5) / 15 * quarter - 2)
                  if (top < 0) return null
                  const fill = VISIT_CODE_FILL[r.code] ?? '#b1d8d8'
                  return (
                    <div
                      key={r.key}
                      data-tutorial-id={`host.mois.cell.dayview-${r.hr}${r.mn}`}
                      title={`${r.last}, ${r.first} — ${r.reason} (${r.code})`}
                      onContextMenu={(e) => onAppt(e, c.owner, c.offset, r)}
                      style={{
                        position: 'absolute', left: 3, width: '44%', minWidth: 80, top: top + 1, height,
                        border: '1px solid #3c3c3c', background: detail ? '#fff' : fill,
                        borderLeft: `5px solid ${fill}`, fontSize: 10, lineHeight: '12px', padding: '1px 3px', overflow: 'hidden',
                        cursor: 'default', zIndex: 1,
                      }}
                    >
                      {detail && (mode === 'week'
                        ? `${r.last}, ${r.first}`
                        : <>{r.last}, {r.first}<br />{r.reason.toUpperCase()}<br />{r.code}</>)}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
